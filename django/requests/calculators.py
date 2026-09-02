from decimal import Decimal


def cny_adjusted_swift(swift, rate, currency, usd_rate):
    # Для CNY SWIFT в базе задан в USD — переводим в эквивалент валюты сделки
    # через курс ЦБ на дату исполнения: SWIFT × курс_USD ÷ курс_CNY.
    if currency == 'CNY' and usd_rate:
        return swift * usd_rate / rate
    return swift


def calc_sebes_mongols(amount, rate_sebes, percent_sebes, swift_sebes, prf_amount, balance, costs, currency=None, usd_rate=None, kzt_rate=None):
    swift = cny_adjusted_swift(swift_sebes, rate_sebes, currency, usd_rate)
    # Затраты себестоимости: (сумма + сумма × процент_схемы + SWIFT_схемы) × курс_себест.
    costs_sebes = (amount + amount * percent_sebes / 100 + swift) * rate_sebes
    # Прибыль: затраты_клиента − затраты_клиента × 0.2% − затраты_себест.
    profit_sebes = costs - costs * 2 / 1000 - costs_sebes if costs is not None else None
    return {'execution_costs_sebes': costs_sebes, 'execution_profit_sebes': profit_sebes}


def calc_sebes_ermak(amount, rate_sebes, percent_sebes, swift_sebes, prf_amount, balance, costs, currency=None, usd_rate=None, kzt_rate=None):
    # Без спецрасчёта для CNY — SWIFT берётся из схемы как есть, курс USD не нужен.
    costs_sebes = (amount + amount * percent_sebes / 100 + swift_sebes) * rate_sebes
    # Прибыль: затраты_клиента − затраты_клиента × 0.2% − затраты_себест.
    profit_sebes = costs - costs * 2 / 1000 - costs_sebes if costs is not None else None
    return {'execution_costs_sebes': costs_sebes, 'execution_profit_sebes': profit_sebes}


# Минимальная комиссия в KZT по валюте сделки — если процент от суммы даёт
# комиссию меньше этого порога, берётся сам порог (переведённый в валюту сделки
# по курсу НБ РК на дату исполнения).
ALSAFI_MIN_FEE_KZT = {'EUR': 50000, 'CNY': 55000}


def calc_sebes_alsafi(amount, rate_sebes, percent_sebes, swift_sebes, prf_amount, balance, costs, currency=None, usd_rate=None, kzt_rate=None):
    fee = amount * percent_sebes / 100
    min_fee_kzt = ALSAFI_MIN_FEE_KZT.get(currency)
    min_fee_applied = False
    if min_fee_kzt and kzt_rate:
        floor = min_fee_kzt / kzt_rate
        if floor > fee:
            fee = floor
            min_fee_applied = True
    costs_sebes = (amount + fee + swift_sebes) * rate_sebes
    # Прибыль: затраты_клиента − затраты_клиента × 0.2% − затраты_себест.
    profit_sebes = costs - costs * 2 / 1000 - costs_sebes if costs is not None else None
    return {
        'execution_costs_sebes': costs_sebes,
        'execution_profit_sebes': profit_sebes,
        'sebes_min_fee_applied': min_fee_applied,
    }


# Процент/SWIFT зависят от суммы перевода в валюте сделки (порог — 50000 EUR/USD),
# а не от значений схемы в админке. Для валют, не перечисленных здесь (CNY),
# используются обычные percent_sebes/swift_sebes из схемы.
STAVROPOL_RULES = {
    'EUR': (50000, Decimal('1.5'), Decimal('0'), Decimal('2.5'), Decimal('100')),
    'USD': (50000, Decimal('1.2'), Decimal('0'), Decimal('1.2'), Decimal('100')),
}


def calc_sebes_stavropol(amount, rate_sebes, percent_sebes, swift_sebes, prf_amount, balance, costs, currency=None, usd_rate=None, kzt_rate=None):
    rule = STAVROPOL_RULES.get(currency)
    if rule:
        threshold, percent_above, swift_above, percent_below, swift_below = rule
        if amount > threshold:
            percent, swift = percent_above, swift_above
        else:
            percent, swift = percent_below, swift_below
    else:
        percent, swift = percent_sebes, swift_sebes
    costs_sebes = (amount + amount * percent / 100 + swift) * rate_sebes
    # Прибыль: затраты_клиента − затраты_клиента × 0.2% − затраты_себест.
    profit_sebes = costs - costs * 2 / 1000 - costs_sebes if costs is not None else None
    return {'execution_costs_sebes': costs_sebes, 'execution_profit_sebes': profit_sebes}


def calc_1(amount, rate, org, prf_amount, currency=None, usd_rate=None):
    swift = cny_adjusted_swift(org.swift_client, rate, currency, usd_rate)
    # (сумма + сумма × процент_клиента + SWIFT_клиента) × курс
    costs = (amount + amount * org.percent_client / 100 + swift) * rate
    balance = prf_amount - costs if prf_amount is not None else None
    return {'execution_costs': costs, 'execution_balance': balance}


def calc_2(amount, rate, org, prf_amount, currency=None, usd_rate=None):
    swift = cny_adjusted_swift(org.swift_client, rate, currency, usd_rate)
    # (сумма / (1 − процент_клиента / 100) + SWIFT_клиента) × курс
    costs = (amount / (1 - org.percent_client / 100) + swift) * rate
    balance = prf_amount - costs if prf_amount is not None else None
    return {'execution_costs': costs, 'execution_balance': balance}


CALCULATORS: dict[str, callable] = {
    'calc_1': calc_1,
    'calc_2': calc_2,
}

CALCULATOR_CHOICES = [
    ('calc_1', 'Прямой'),
    ('calc_2', 'Обратный'),
]


def get_calculator(name: str):
    return CALCULATORS.get(name, calc_1)


SEBES_CALCULATORS: dict[str, callable] = {
    'calc_sebes_mongols': calc_sebes_mongols,
    'calc_sebes_ermak': calc_sebes_ermak,
    'calc_sebes_alsafi': calc_sebes_alsafi,
    'calc_sebes_stavropol': calc_sebes_stavropol,
}

SEBES_CALCULATOR_CHOICES = [
    ('calc_sebes_mongols', 'Монголы'),
    ('calc_sebes_ermak', 'Ермак'),
    ('calc_sebes_alsafi', 'Альсафи'),
    ('calc_sebes_stavropol', 'Ставрополь'),
]


def get_sebes_calculator(name: str):
    return SEBES_CALCULATORS.get(name, calc_sebes_mongols)
