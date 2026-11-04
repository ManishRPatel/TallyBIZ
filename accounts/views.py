from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from selling.models import SalesInvoice
from buying.models import PurchaseInvoice
from django.db.models.functions import TruncMonth
from decimal import Decimal
from .models import GLEntry, PaymentEntry
from .serializers import PaymentEntrySerializer
from django.db import transaction

class PaymentEntryListCreateAPIView(generics.ListCreateAPIView):
    queryset = PaymentEntry.objects.all().order_by('-id')
    serializer_class = PaymentEntrySerializer

class PaymentEntryRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PaymentEntry.objects.all()
    serializer_class = PaymentEntrySerializer

    @transaction.atomic
    def perform_destroy(self, instance):
        # Payment delete thay tyare teni sathe jodayeli GL Entries pan delete karo
        GLEntry.objects.filter(voucher_type='Payment Entry', voucher_no=instance.voucher_no).delete()
        instance.delete()

class GSTReturnSummaryAPIView(APIView):
    def get(self, request):
        # is_cancelled ni jagya par status='Submitted' vaporo athava filter remove karo
        sales_gst = SalesInvoice.objects.filter(status='Submitted').annotate(
            month=TruncMonth('posting_date')
        ).values('month').annotate(
            total_tax=Sum('tax_amount'),
            total_net=Sum('net_total')
        ).order_by('month')

        purchase_gst = PurchaseInvoice.objects.filter(status='Submitted').annotate(
            month=TruncMonth('posting_date')
        ).values('month').annotate(
            total_tax=Sum('tax_amount'),
            total_net=Sum('net_total')
        ).order_by('month')

        summary_map = {}

        for s in sales_gst:
            m_str = s['month'].strftime('%Y-%m') if s['month'] else 'Unknown'
            if m_str not in summary_map:
                summary_map[m_str] = {'month': m_str, 'output_tax': 0, 'input_itc': 0, 'sales_net': 0, 'purchase_net': 0}
            summary_map[m_str]['output_tax'] = float(s['total_tax'] or 0)
            summary_map[m_str]['sales_net'] = float(s['total_net'] or 0)

        for p in purchase_gst:
            m_str = p['month'].strftime('%Y-%m') if p['month'] else 'Unknown'
            if m_str not in summary_map:
                summary_map[m_str] = {'month': m_str, 'output_tax': 0, 'input_itc': 0, 'sales_net': 0, 'purchase_net': 0}
            summary_map[m_str]['input_itc'] = float(p['total_tax'] or 0)
            summary_map[m_str]['purchase_net'] = float(p['total_net'] or 0)

        result = []
        for m_str in sorted(summary_map.keys(), reverse=True):
            row = summary_map[m_str]
            net_payable = row['output_tax'] - row['input_itc']
            row['net_gst_payable'] = max(0.0, net_payable)
            row['itc_carry_forward'] = abs(net_payable) if net_payable < 0 else 0.0
            result.append(row)

        return Response(result)

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
class DashboardSummaryAPIView(APIView):
    def get(self, request):
        # Total Sales Calculation
        total_sales = SalesInvoice.objects.filter(status='Submitted').aggregate(total=Sum('grand_total'))['total'] or 0
        
        # Total Purchases Calculation
        total_purchases = PurchaseInvoice.objects.filter(status='Submitted').aggregate(total=Sum('grand_total'))['total'] or 0
        
        # Bank Balance Calculation from General Ledger
        bank_entries = GLEntry.objects.filter(account='Bank Account')
        bank_debit = bank_entries.aggregate(total=Sum('debit'))['total'] or 0
        bank_credit = bank_entries.aggregate(total=Sum('credit'))['total'] or 0
        bank_balance = float(bank_debit) - float(bank_credit)

        data = {
            "total_sales": float(total_sales),
            "total_purchases": float(total_purchases),
            "bank_balance": bank_balance
        }
        return Response(data)

class PartyOutstandingAPIView(APIView):
    def get(self, request):
        # Customers (Debtors): Debit વધે (વેચાણ), Credit ઘટે (ચુકવણી)
        debtor_entries = GLEntry.objects.filter(account="Debtors", is_cancelled=False)
        cust_summary = debtor_entries.values('party').annotate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        ).order_by('-total_debit')

        customers_data = {}
        total_receivable = Decimal('0.00')

        for c in cust_summary:
            party = c['party'] or 'Unknown'
            billed = c['total_debit'] or Decimal('0.00')
            received = c['total_credit'] or Decimal('0.00')
            bal = billed - received
            if bal > Decimal('0.00'):
                total_receivable += bal
            customers_data[party] = float(bal)

        # Suppliers (Creditors): Credit વધે (ખરીદી), Debit ઘટે (ચુકવણી)
        creditor_entries = GLEntry.objects.filter(account="Creditors", is_cancelled=False)
        supp_summary = creditor_entries.values('party').annotate(
            total_credit=Sum('credit'),
            total_debit=Sum('debit')
        ).order_by('-total_credit')

        suppliers_data = {}
        total_payable = Decimal('0.00')

        for s in supp_summary:
            party = s['party'] or 'Unknown'
            billed = s['total_credit'] or Decimal('0.00')
            paid = s['total_debit'] or Decimal('0.00')
            bal = billed - paid
            if bal > Decimal('0.00'):
                total_payable += bal
            suppliers_data[party] = float(bal)

        return Response({
            'customers': customers_data,
            'suppliers': suppliers_data,
            'total_receivable': float(total_receivable),
            'total_payable': float(total_payable)
        })