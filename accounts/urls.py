from django.urls import path
from .views import GeneralLedgerAPIView, PaymentEntryListCreateAPIView, FinancialStatementsAPIView

urlpatterns = [
    path('general-ledger/', GeneralLedgerAPIView.as_view(), name='general-ledger'),
    path('payments/', PaymentEntryListCreateAPIView.as_view(), name='payments'),
    path('payment-entries/', PaymentEntryListCreateAPIView.as_view(), name='payment-entries'),
    path('financial-statements/', FinancialStatementsAPIView.as_view(), name='financial-statements'),
]