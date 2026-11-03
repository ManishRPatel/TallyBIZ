from rest_framework import generics
from django.db import transaction
from decimal import Decimal
from .models import Supplier, PurchaseInvoice
from .serializers import SupplierSerializer, PurchaseInvoiceSerializer
from stock.models import StockLedgerEntry
from accounts.models import GLEntry

class SupplierListCreateAPIView(generics.ListCreateAPIView):
    queryset = Supplier.objects.all().order_by('-id')
    serializer_class = SupplierSerializer

class SupplierRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

class PurchaseInvoiceListCreateAPIView(generics.ListCreateAPIView):
    queryset = PurchaseInvoice.objects.all().order_by('-id')
    serializer_class = PurchaseInvoiceSerializer

class PurchaseInvoiceRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PurchaseInvoice.objects.all()
    serializer_class = PurchaseInvoiceSerializer

    @transaction.atomic
    def perform_destroy(self, instance):
        # 1. ખરીદેલી વસ્તુઓનો સ્ટોક પાછો ઘટાડો
        for item_row in instance.items.all():
            item_obj = item_row.item
            item_obj.current_stock -= item_row.quantity
            item_obj.save()

        # 2. વાઉચર સાથે જોડાયેલ Stock અને GL Entries ડિલીટ કરો
        StockLedgerEntry.objects.filter(voucher_type='Purchase Invoice', voucher_no=instance.bill_number).delete()
        GLEntry.objects.filter(voucher_type='Purchase Invoice', voucher_no=instance.bill_number).delete()

        # 3. પરચેઝ બિલ ડિલીટ કરો
        instance.delete()