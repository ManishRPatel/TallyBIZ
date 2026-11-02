from rest_framework import generics
from .models import Customer, SalesInvoice
from .serializers import CustomerSerializer, SalesInvoiceSerializer

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