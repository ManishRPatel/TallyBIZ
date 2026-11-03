from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Q
from decimal import Decimal
from .models import GLEntry, PaymentEntry
from .serializers import PaymentEntrySerializer

class PaymentEntryListCreateAPIView(generics.ListCreateAPIView):
    queryset = PaymentEntry.objects.all().order_by('-id')
    serializer_class = PaymentEntrySerializer

class GeneralLedgerAPIView(APIView):
    def get(self, request):
        party = request.GET.get('party')
        account = request.GET.get('account')
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')

        filters = {'is_cancelled': False}
        if party and party != 'all':
            filters['party'] = party
        if account and account != 'all':
            filters['account'] = account
        if from_date:
            filters['posting_date__gte'] = from_date
        if to_date:
            filters['posting_date__lte'] = to_date

        # Chronological sort: pehla date ane pachi entry ID jethi bills pehla ane payments pachi ganay
        entries = GLEntry.objects.filter(**filters).order_by('posting_date', 'id')

        report = []
        running_balance = Decimal('0.00')

        for row in entries:
            # Liability, Supplier ane Income accounts Credit thi vadhe, baki badha Debit thi vadhe
            if row.account in ['Creditors', 'Output GST', 'Sales Income']:
                running_balance += (row.credit - row.debit)
            else:
                running_balance += (row.debit - row.credit)

            report.append({
                'id': row.id,
                'posting_date': row.posting_date,
                'account': row.account,
                'party_type': row.party_type,
                'party': row.party,
                'voucher_type': row.voucher_type,
                'voucher_no': row.voucher_no,
                'against': row.against,
                'remarks': row.remarks,
                'debit': float(row.debit),
                'credit': float(row.credit),
                'balance': float(running_balance)
            })

        return Response(report)

class FinancialStatementsAPIView(APIView):
    def get(self, request):
        sales_credit = GLEntry.objects.filter(account="Sales Income", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00')
        sales_debit = GLEntry.objects.filter(account="Sales Income", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')
        net_sales = sales_credit - sales_debit

        stock_in_debit = GLEntry.objects.filter(account="Stock Received But Not Billed", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')
        stock_in_credit = GLEntry.objects.filter(account="Stock Received But Not Billed", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00')
        total_purchases = stock_in_debit - stock_in_credit

        input_gst = (GLEntry.objects.filter(account="Input GST", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')) - \
                    (GLEntry.objects.filter(account="Input GST", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00'))
        
        # Output GST એ liability છે: credit - debit થી net liability મળે (debit reversal સામે)
        output_gst = (GLEntry.objects.filter(account="Output GST", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00')) - \
                     (GLEntry.objects.filter(account="Output GST", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00'))

        net_gst_payable = output_gst - input_gst

        debtors = (GLEntry.objects.filter(account="Debtors", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')) - \
                  (GLEntry.objects.filter(account="Debtors", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00'))

        creditors = (GLEntry.objects.filter(account="Creditors", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00')) - \
                    (GLEntry.objects.filter(account="Creditors", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00'))

        bank_balance = (GLEntry.objects.filter(account="Bank Account", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')) - \
                       (GLEntry.objects.filter(account="Bank Account", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00'))

        gross_profit = net_sales - total_purchases

        return Response({
            "income": { "sales": float(net_sales), "total_income": float(net_sales) },
            "expense": { "purchases": float(total_purchases), "total_expense": float(total_purchases) },
            "profit": { "gross_profit": float(gross_profit), "net_profit": float(gross_profit) },
            "gst": { "input_itc": float(input_gst), "output_liability": float(output_gst), "net_payable": float(net_gst_payable) },
            "balance_sheet": {
                "assets": {
                    "bank_cash": float(bank_balance),
                    "debtors_receivable": float(debtors),
                    "total_assets": float(bank_balance + debtors)
                },
                "liabilities": {
                    "creditors_payable": float(creditors),
                    "gst_payable": float(max(net_gst_payable, Decimal('0.00'))),
                    "total_liabilities": float(creditors + max(net_gst_payable, Decimal('0.00')))
                }
            }
        })