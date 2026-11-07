from django.urls import path
from .views import (
    CreditNoteListCreateAPIView,
    CreditNoteRetrieveUpdateDestroyAPIView,
    CustomerListCreateAPIView, 
    CustomerRetrieveUpdateDestroyAPIView,
    SalesInvoiceListCreateAPIView, 
    SalesInvoiceRetrieveUpdateDestroyAPIView
)

urlpatterns = [
    path('customers/', CustomerListCreateAPIView.as_view(), name='customer-list-create'),
    path('customers/<int:pk>/', CustomerRetrieveUpdateDestroyAPIView.as_view(), name='customer-detail'),
    path('invoices/', SalesInvoiceListCreateAPIView.as_view(), name='sales-invoice-list-create'),
    path('invoices/<int:pk>/', SalesInvoiceRetrieveUpdateDestroyAPIView.as_view(), name='sales-invoice-detail'),
    path('credit-notes/', CreditNoteListCreateAPIView.as_view(), name='credit-note-list-create'),
    path('credit-notes/<int:pk>/', CreditNoteRetrieveUpdateDestroyAPIView.as_view(), name='credit-note-detail'),
]