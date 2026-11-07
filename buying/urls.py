from django.urls import path
from .views import (
    DebitNoteListCreateAPIView,
    DebitNoteRetrieveUpdateDestroyAPIView,
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
    path('debit-notes/', DebitNoteListCreateAPIView.as_view(), name='debit-note-list-create'),
    path('debit-notes/<int:pk>/', DebitNoteRetrieveUpdateDestroyAPIView.as_view(), name='debit-note-detail'),
]