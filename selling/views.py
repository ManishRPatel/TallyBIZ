from rest_framework import generics
from django.db import transaction
from decimal import Decimal
from .models import Customer, SalesInvoice
from .serializers import CustomerSerializer, SalesInvoiceSerializer
from stock.models import StockLedgerEntry
from accounts.models import GLEntry

class CustomerListCreateAPIView(generics.ListCreateAPIView):
    queryset = Customer.objects.all().order_by('-id')
    serializer_class = CustomerSerializer

class CustomerRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

class SalesInvoiceListCreateAPIView(generics.ListCreateAPIView):
    queryset = SalesInvoice.objects.all().order_by('-id')
    serializer_class = SalesInvoiceSerializer

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
        
        # 3. ઇન્વોઇસ ડિલીટ કરો
        instance.delete()