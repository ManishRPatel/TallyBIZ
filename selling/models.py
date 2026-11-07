from django.db import models
from decimal import Decimal
from stock.models import Item

class Customer(models.Model):
    CUSTOMER_TYPE_CHOICES = (
        ('Company', 'Company'),
        ('Individual', 'Individual'),
    )
    GST_CATEGORY_CHOICES = (
        ('Unregistered', 'Unregistered'),
        ('Registered Regular', 'Registered Regular'),
        ('Registered Composition', 'Registered Composition'),
    )

    customer_name = models.CharField(max_length=200, unique=True)
    customer_type = models.CharField(max_length=50, choices=CUSTOMER_TYPE_CHOICES, default='Company')
    gst_category = models.CharField(max_length=50, choices=GST_CATEGORY_CHOICES, default='Unregistered')
    gstin = models.CharField(max_length=15, blank=True, null=True)
    
    email = models.EmailField(blank=True, null=True)
    mobile_no = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.customer_name


class SalesInvoice(models.Model):
    invoice_number = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, null=True, blank=True, related_name='invoices')
    customer_name = models.CharField(max_length=200)
    posting_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    
    net_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    
    status = models.CharField(max_length=50, default='Submitted')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name}"


# TallyBIZ/selling/models.py

class SalesInvoiceItem(models.Model):
    invoice = models.ForeignKey(SalesInvoice, related_name='items', on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    description = models.CharField(max_length=255, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=1.0)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    
    # --- New Fields ---
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    is_foc = models.BooleanField(default=False)  # Free of Cost (Sample)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0) # Taxable value

    def save(self, *args, **kwargs):
        if self.is_foc:
            self.rate = 0.0
            self.discount_percentage = 0.0
            self.discount_amount = 0.0
            self.amount = 0.0
        else:
            base_amt = float(self.quantity) * float(self.rate)
            if float(self.discount_percentage) > 0:
                disc = base_amt * (float(self.discount_percentage) / 100.0)
                self.discount_amount = disc
            self.amount = max(0.0, base_amt - float(self.discount_amount))
            
        super().save(*args, **kwargs)

class CreditNote(models.Model):
    credit_note_number = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, null=True, blank=True)
    customer_name = models.CharField(max_length=200)
    sales_invoice = models.ForeignKey(SalesInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='credit_notes')
    posting_date = models.DateField()
    
    net_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Submitted')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"CN #{self.credit_note_number} - {self.customer_name}"


class CreditNoteItem(models.Model):
    credit_note = models.ForeignKey(CreditNote, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=14, decimal_places=2)

    def __str__(self):
        return f"{self.item.item_name} ({self.quantity})"