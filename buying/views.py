from rest_framework import generics
from .models import Supplier, PurchaseInvoice
from .serializers import SupplierSerializer, PurchaseInvoiceSerializer

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