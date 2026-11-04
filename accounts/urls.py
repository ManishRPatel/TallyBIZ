from django.urls import path
from .views import (
    PaymentEntryListCreateAPIView,
    PaymentEntryRetrieveUpdateDestroyAPIView,
    GeneralLedgerAPIView,
    FinancialStatementsAPIView,
    GSTReturnSummaryAPIView,
    DashboardSummaryAPIView,
)

urlpatterns = [
    path('payments/', PaymentEntryListCreateAPIView.as_view(), name='payment-list-create'),
    path('payments/<int:pk>/', PaymentEntryRetrieveUpdateDestroyAPIView.as_view(), name='payment-detail'),
    path('general-ledger/', GeneralLedgerAPIView.as_view(), name='general-ledger'),
    path('financial-statements/', FinancialStatementsAPIView.as_view(), name='financial-statements'),
    path('gst-returns/', GSTReturnSummaryAPIView.as_view(), name='gst-return-summary'),
    path('dashboard-summary/', DashboardSummaryAPIView.as_view(), name='dashboard-summary'),
]