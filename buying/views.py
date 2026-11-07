from rest_framework import generics
from django.db import transaction
from decimal import Decimal
from django.db.models import Sum
from .models import Supplier, PurchaseInvoice, DebitNote
from .serializers import SupplierSerializer, PurchaseInvoiceSerializer, DebitNoteSerializer
from stock.models import StockLedgerEntry
from accounts.models import GLEntry, PaymentInvoiceAllocation


# --- SUPPLIER VIEWS ---
class SupplierListCreateAPIView(generics.ListCreateAPIView):
    queryset = Supplier.objects.all().order_by('-id')
    serializer_class = SupplierSerializer


class SupplierRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

class DebitNoteListCreateAPIView(generics.ListCreateAPIView):
    queryset = DebitNote.objects.all().order_by('-id')
    serializer_class = DebitNoteSerializer

# --- PURCHASE INVOICE VIEWS ---
class PurchaseInvoiceListCreateAPIView(generics.ListCreateAPIView):
    queryset = PurchaseInvoice.objects.all().order_by('-posting_date', '-bill_number')
    serializer_class = PurchaseInvoiceSerializer

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        for item in response.data:
            bill_id = item.get('id')
            grand_total = Decimal(str(item.get('grand_total', 0) or 0))

            allocated = PaymentInvoiceAllocation.objects.filter(
                invoice_type='Purchase Invoice',
                invoice_id=bill_id
            ).aggregate(s=Sum('allocated_amount'))['s'] or Decimal('0.00')

            outstanding = max(Decimal('0.00'), grand_total - allocated)
            item['allocated_amount'] = float(allocated)
            item['outstanding_amount'] = float(outstanding)

            if outstanding <= Decimal('0.00') and grand_total > Decimal('0.00'):
                item['payment_status'] = 'Paid'
            elif allocated > Decimal('0.00'):
                item['payment_status'] = 'Partly Paid'
            else:
                item['payment_status'] = 'Unpaid'

        return response


class PurchaseInvoiceRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PurchaseInvoice.objects.all()
    serializer_class = PurchaseInvoiceSerializer

    @transaction.atomic
    def perform_destroy(self, instance):
        for item_row in instance.items.all():
            item_obj = item_row.item
            item_obj.current_stock -= item_row.quantity
            item_obj.save()

        StockLedgerEntry.objects.filter(voucher_type='Purchase Invoice', voucher_no=instance.bill_number).delete()
        GLEntry.objects.filter(voucher_type='Purchase Invoice', voucher_no=instance.bill_number).delete()
        PaymentInvoiceAllocation.objects.filter(invoice_type='Purchase Invoice', invoice_id=instance.id).delete()

        instance.delete()