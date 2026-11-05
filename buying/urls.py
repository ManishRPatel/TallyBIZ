from django.urls import path
from .views import (
    SupplierListCreateAPIView,
    SupplierRetrieveUpdateDestroyAPIView,
    PurchaseInvoiceListCreateAPIView,
    PurchaseInvoiceRetrieveUpdateDestroyAPIView,
)

urlpatterns = [
    path('suppliers/', SupplierListCreateAPIView.as_view(), name='supplier-list-create'),
    path('suppliers/<int:pk>/', SupplierRetrieveUpdateDestroyAPIView.as_view(), name='supplier-detail'),
    path('invoices/', PurchaseInvoiceListCreateAPIView.as_view(), name='purchase-invoice-list-create'),
    path('invoices/<int:pk>/', PurchaseInvoiceRetrieveUpdateDestroyAPIView.as_view(), name='purchase-invoice-detail'),
]