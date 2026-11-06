from django.db import models
from decimal import Decimal
from stock.models import Item

class Supplier(models.Model):
    SUPPLIER_TYPE_CHOICES = (
        ('Company', 'Company'),
        ('Individual', 'Individual'),
    )
    GST_CATEGORY_CHOICES = (
        ('Unregistered', 'Unregistered'),
        ('Registered Regular', 'Registered Regular'),
        ('Registered Composition', 'Registered Composition'),
    )

    supplier_name = models.CharField(max_length=200, unique=True)
    supplier_type = models.CharField(max_length=50, choices=SUPPLIER_TYPE_CHOICES, default='Company')
    gst_category = models.CharField(max_length=50, choices=GST_CATEGORY_CHOICES, default='Registered Regular')
    gstin = models.CharField(max_length=15, blank=True, null=True)
    
    email = models.EmailField(blank=True, null=True)
    mobile_no = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.supplier_name


class PurchaseInvoice(models.Model):
    bill_number = models.CharField(max_length=100, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, null=True, blank=True, related_name='purchase_invoices')
    supplier_name = models.CharField(max_length=200)
    posting_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    
    net_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    
    status = models.CharField(max_length=50, default='Submitted')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.bill_number} - {self.supplier_name}"


class PurchaseInvoiceItem(models.Model):
    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    is_foc = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.item.item_name} ({self.quantity})"