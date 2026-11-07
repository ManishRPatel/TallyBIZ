from django.db import models
from decimal import Decimal

class Item(models.Model):
    item_code = models.CharField(max_length=100, unique=True)
    item_name = models.CharField(max_length=200)
    category = models.CharField(max_length=100, default='General')
    unit = models.CharField(max_length=50, default='Nos')
    standard_rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item_name} ({self.item_code})"


class StockLedgerEntry(models.Model):
    posting_date = models.DateField()
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    voucher_type = models.CharField(max_length=50)
    voucher_no = models.CharField(max_length=50)
    actual_qty = models.DecimalField(max_digits=12, decimal_places=2)
    qty_after_transaction = models.DecimalField(max_digits=12, decimal_places=2)
    incoming_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    valuation_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    stock_value = models.DecimalField(max_digits=14, decimal_places=2, default=0.0)

    class Meta:
        indexes = [
            models.Index(fields=['item', 'posting_date']),
            models.Index(fields=['voucher_type', 'voucher_no']),
        ]

    def __str__(self):
        return f"{self.posting_date} | {self.item.item_code} | Qty: {self.actual_qty}"