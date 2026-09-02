from rest_framework import serializers
from rates.models import ExchangeRate


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = ['date', 'usd', 'eur', 'cny']
