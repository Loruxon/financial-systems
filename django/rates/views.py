import xml.etree.ElementTree as ET
import urllib.request
import urllib.parse
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from rest_framework import status as http_status
from rest_framework.views import APIView
from rest_framework.response import Response

from auth_middleware import AccessTokenAuthentication
from rates.models import ExchangeRate
from rates.serializers import ExchangeRateSerializer

CBR_URL = "https://www.cbr.ru/scripts/XML_daily.asp"
CBR_CURRENCIES = {"USD", "EUR", "CNY"}


def fetch_and_save_rate(date_str):
    """Fetch rates from CBR for YYYY-MM-DD, save to DB, return ExchangeRate or None."""
    year, month, day = date_str.split("-")
    url = f"{CBR_URL}?{urllib.parse.urlencode({'date_req': f'{day}/{month}/{year}'})}"
    with urllib.request.urlopen(url, timeout=10) as resp:
        content = resp.read()

    root = ET.fromstring(content)

    # CBR returns the latest available date when the requested date is in the future
    # or has no data — validate that the response date matches what we asked for
    cbr_date = root.get("Date", "")  # format: DD.MM.YYYY
    cbr_date_iso = "-".join(reversed(cbr_date.split("."))) if cbr_date else ""
    if cbr_date_iso != date_str:
        return None

    rates = {}
    for valute in root.findall("Valute"):
        code = valute.find("CharCode").text
        if code in CBR_CURRENCIES:
            rates[code.lower()] = valute.find("VunitRate").text.replace(",", ".")

    if len(rates) < len(CBR_CURRENCIES):
        return None

    rate, _ = ExchangeRate.objects.get_or_create(date=date_str, defaults={**rates})
    return rate


def get_usd_rate_for_date(target_date):
    """Курс USD на дату, либо на ближайшую предыдущую доступную (выходные/праздники), либо None."""
    for i in range(8):
        d_str = (target_date - timedelta(days=i)).isoformat()
        try:
            return ExchangeRate.objects.get(date=d_str).usd
        except ExchangeRate.DoesNotExist:
            pass
        try:
            rate = fetch_and_save_rate(d_str)
        except Exception:
            rate = None
        if rate is not None:
            return rate.usd
    return None


NBK_RATES_URL = "https://nationalbank.kz/rss/get_rates.cfm"


def _fetch_nbk_rates(date_str):
    """date_str: DD.MM.YYYY. Возвращает {код_валюты: KZT за 1 единицу} или None, если на эту дату данных нет."""
    url = f"{NBK_RATES_URL}?{urllib.parse.urlencode({'fdate': date_str})}"
    with urllib.request.urlopen(url, timeout=10) as resp:
        content = resp.read()
    root = ET.fromstring(content)
    if root.findtext('date', '') != date_str:
        return None

    rates = {}
    for item in root.findall('item'):
        code = item.findtext('title', '')
        value = item.findtext('description', '')
        quant = item.findtext('quant', '1')
        if not code or not value:
            continue
        try:
            rates[code] = Decimal(value) / Decimal(quant)
        except (InvalidOperation, ValueError):
            continue
    return rates or None


def get_nbk_rate_for_date(currency, target_date):
    """Курс НБ РК (KZT за 1 единицу валюты) на дату, либо на ближайшую предыдущую доступную, либо None."""
    for i in range(8):
        d_str = (target_date - timedelta(days=i)).strftime('%d.%m.%Y')
        try:
            rates = _fetch_nbk_rates(d_str)
        except Exception:
            rates = None
        if rates and currency in rates:
            return rates[currency]
    return None


class ExchangeRateListView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        rates = ExchangeRate.objects.all()[:30]
        return Response(ExchangeRateSerializer(rates, many=True).data)


class ExchangeRateLatestView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        today = date.today()
        for i in range(7):
            d = today - timedelta(days=i)
            d_str = d.isoformat()
            if not ExchangeRate.objects.filter(date=d_str).exists():
                try:
                    fetch_and_save_rate(d_str)
                except Exception:
                    pass

        rates = list(ExchangeRate.objects.all()[:2])
        if not rates:
            return Response(status=http_status.HTTP_404_NOT_FOUND)
        return Response(ExchangeRateSerializer(rates, many=True).data)


DAYS_RU_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]


class ExchangeRateLiveView(APIView):
    """Always fetches from CBR directly — never reads or writes the DB."""
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'error': 'Параметр date обязателен (YYYY-MM-DD)'}, status=http_status.HTTP_400_BAD_REQUEST)

        try:
            req_date = date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Неверный формат даты, ожидается YYYY-MM-DD'}, status=http_status.HTTP_400_BAD_REQUEST)

        cbr_date_req = req_date.strftime('%d/%m/%Y')
        url = f"{CBR_URL}?{urllib.parse.urlencode({'date_req': cbr_date_req})}"

        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                content = resp.read()
        except OSError as e:
            return Response({'error': f'ЦБ недоступен: {e}'}, status=http_status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            return Response({'error': 'Некорректный XML от ЦБ'}, status=http_status.HTTP_502_BAD_GATEWAY)

        cbr_date = root.get("Date", "")
        if not cbr_date:
            return Response({'error': 'Дата отсутствует в ответе ЦБ'}, status=http_status.HTTP_502_BAD_GATEWAY)

        try:
            d, m, y = cbr_date.split(".")
            cbr_date_parsed = date(int(y), int(m), int(d))
        except (ValueError, AttributeError):
            return Response({'error': f'Нераспознаваемая дата ЦБ: {cbr_date}'}, status=http_status.HTTP_502_BAD_GATEWAY)

        cbr_date_iso = cbr_date_parsed.isoformat()

        rates = {}
        for valute in root.findall("Valute"):
            code = valute.findtext("CharCode", "")
            if code in CBR_CURRENCIES:
                val_text = valute.findtext("VunitRate", "")
                if val_text:
                    rates[code.lower()] = val_text.replace(",", ".")

        missing = CBR_CURRENCIES - {k.upper() for k in rates}
        if missing:
            return Response(
                {'error': f'Нет курсов для: {", ".join(sorted(missing))}'},
                status=http_status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            **rates,
            'cbr_date': cbr_date,
            'cbr_date_iso': cbr_date_iso,
            'day_of_week': DAYS_RU_SHORT[cbr_date_parsed.weekday()],
            'is_different': cbr_date_iso != date_str,
        })


class ExchangeRateDetailView(APIView):
    authentication_classes = [AccessTokenAuthentication]

    def get(self, request, date):
        try:
            rate = ExchangeRate.objects.get(date=date)
            return Response({**ExchangeRateSerializer(rate).data, "source": "db"})
        except ExchangeRate.DoesNotExist:
            pass

        try:
            rate = fetch_and_save_rate(date)
        except Exception:
            return Response(status=http_status.HTTP_404_NOT_FOUND)

        if rate is None:
            return Response(status=http_status.HTTP_404_NOT_FOUND)

        return Response({**ExchangeRateSerializer(rate).data, "source": "cbr"})
