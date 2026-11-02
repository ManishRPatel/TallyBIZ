from django.db import models
from decimal import Decimal

class GLEntry(models.Model):
    PARTY_TYPES = (
        ('Customer', 'Customer'),
        ('Supplier', 'Supplier'),
    )

    posting_date = models.DateField()
    account = models.CharField(max_length=150)
    party_type = models.CharField(max_length=50, choices=PARTY_TYPES, null=True, blank=True)
    party = models.CharField(max_length=200, null=True, blank=True)
    
    voucher_type = models.CharField(max_length=100)
    voucher_no = models.CharField(max_length=100)
    against = models.CharField(max_length=200, blank=True, default='')
    
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    
    remarks = models.TextField(blank=True, default='')
    is_cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['voucher_type', 'voucher_no']),
            models.Index(fields=['party_type', 'party']),
            models.Index(fields=['posting_date', 'account']),
        ]

    def __str__(self):
        return f"{self.posting_date} | {self.voucher_type} #{self.voucher_no} | D:{self.debit} C:{self.credit}"


class PaymentEntry(models.Model):
    PAYMENT_TYPE_CHOICES = (
        ('Receive', 'Receive (From Customer)'),
        ('Pay', 'Pay (To Supplier)'),
    )
    MODE_OF_PAYMENT = (
        ('Bank', 'Bank Transfer / UPI'),
        ('Cash', 'Cash'),
        ('Cheque', 'Cheque'),
    )

    voucher_no = models.CharField(max_length=100, unique=True)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='Receive')
    posting_date = models.DateField()
    party_type = models.CharField(max_length=50, default='Customer')
    party_name = models.CharField(max_length=200)
    mode_of_payment = models.CharField(max_length=50, choices=MODE_OF_PAYMENT, default='Bank')
    
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    reference_no = models.CharField(max_length=100, blank=True, null=True)
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.voucher_no} - {self.party_name} (₹{self.paid_amount})"
    