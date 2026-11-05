from rest_framework import generics
from django.db import transaction
from decimal import Decimal
from .models import Customer, SalesInvoice
from .serializers import CustomerSerializer, SalesInvoiceSerializer
from stock.models import StockLedgerEntry
from accounts.models import GLEntry, PaymentInvoiceAllocation
from django.db.models import Sum

class CustomerListCreateAPIView(generics.ListCreateAPIView):
    queryset = Customer.objects.all().order_by('-id')
    serializer_class = CustomerSerializer

class CustomerRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

class SalesInvoiceListCreateAPIView(generics.ListCreateAPIView):
    queryset = SalesInvoice.objects.all().order_by('-posting_date', '-invoice_number')
    serializer_class = SalesInvoiceSerializer

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        for item in response.data:
            inv_id = item.get('id')
            grand_total = Decimal(str(item.get('grand_total', 0) or 0))
            
            # આ ઇન્વોઇસ સામે કુલ કેટલા રૂપિયા એડજસ્ટ/નોક-ઓફ થયા છે
            allocated = PaymentInvoiceAllocation.objects.filter(
                invoice_type='Sales Invoice',
                invoice_id=inv_id
            ).aggregate(s=Sum('allocated_amount'))['s'] or Decimal('0.00')

            outstanding = max(Decimal('0.00'), grand_total - allocated)
            item['allocated_amount'] = float(allocated)
            item['outstanding_amount'] = float(outstanding)

            # લાઈવ પેમેન્ટ સ્ટેટસ
            if outstanding <= Decimal('0.00') and grand_total > Decimal('0.00'):
                item['payment_status'] = 'Paid'
            elif allocated > Decimal('0.00'):
                item['payment_status'] = 'Partly Paid'
            else:
                item['payment_status'] = 'Unpaid'

        return response

class SalesInvoiceRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SalesInvoice.objects.all()
    serializer_class = SalesInvoiceSerializer

    @transaction.atomic
    def perform_destroy(self, instance):
        # 1. વેચેલી વસ્તુઓનો સ્ટોક પાછો ઉમેરો
        for item_row in instance.items.all():
            item_obj = item_row.item
            item_obj.current_stock += item_row.quantity
            item_obj.save()

        # 2. વાઉચર સાથે જોડાયેલ Stock અને GL Entries ડિલીટ કરો
        StockLedgerEntry.objects.filter(voucher_type='Sales Invoice', voucher_no=instance.invoice_number).delete()
        GLEntry.objects.filter(voucher_type='Sales Invoice', voucher_no=instance.invoice_number).delete()
        PaymentInvoiceAllocation.objects.filter(invoice_type='Sales Invoice', invoice_id=instance.id).delete()
        
        # 3. ઇન્વોઇસ ડિલીટ કરો
        instance.delete()