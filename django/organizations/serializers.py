from django.db import transaction
from rest_framework import serializers
from organizations.models import Organization, Counterparty, Bank, BankAccount, Recipient, Payer


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'percent_client', 'swift_client']


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'account', 'currencies']


class BankSerializer(serializers.ModelSerializer):
    accounts = BankAccountSerializer(many=True)

    class Meta:
        model = Bank
        fields = ['id', 'name', 'address', 'swift_code', 'bank_type', 'active', 'accounts']

    def create(self, validated_data):
        accounts_data = validated_data.pop('accounts')
        bank = Bank.objects.create(**validated_data)
        for account_data in accounts_data:
            BankAccount.objects.create(bank=bank, **account_data)
        return bank

    @transaction.atomic
    def update(self, instance, validated_data):
        accounts_data = validated_data.pop('accounts', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if accounts_data is not None:
            instance.accounts.all().delete()
            for account_data in accounts_data:
                BankAccount.objects.create(bank=instance, **account_data)
        return instance


class CounterpartySerializer(serializers.ModelSerializer):
    banks = BankSerializer(many=True, read_only=True)

    class Meta:
        model = Counterparty
        fields = ['id', 'name', 'address', 'banks']
        read_only_fields = ['id']


class CounterpartyListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Counterparty
        fields = ['id', 'name', 'address']


class RecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipient
        fields = ['id', 'name', 'initial_balance']


class PayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payer
        fields = ['id', 'name', 'inn']
