from rest_framework import serializers
from .models import Item, StockLedgerEntry

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = '__all__'

class StockLedgerEntrySerializer(serializers.ModelSerializer):
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_name = serializers.CharField(source='item.item_name', read_only=True)

    class Meta:
        model = StockLedgerEntry
        fields = '__all__'