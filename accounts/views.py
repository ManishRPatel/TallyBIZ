from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from selling.models import SalesInvoice
from buying.models import PurchaseInvoice
from decimal import Decimal
from .models import GLEntry, PaymentEntry, JournalEntry, JournalEntryLine, PaymentInvoiceAllocation
from .serializers import PaymentEntrySerializer, JournalEntrySerializer
from django.db import transaction


class PaymentEntryListCreateAPIView(generics.ListCreateAPIView):
    queryset = PaymentEntry.objects.all().order_by('-id')
    serializer_class = PaymentEntrySerializer


class PaymentEntryRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PaymentEntry.objects.all()
    serializer_class = PaymentEntrySerializer

    @transaction.atomic
    def perform_destroy(self, instance):
        GLEntry.objects.filter(voucher_type='Payment Entry', voucher_no=instance.voucher_no).delete()
        instance.delete()


class GSTReturnSummaryAPIView(APIView):
    def get(self, request):
        sales_invoices = SalesInvoice.objects.filter(status='Submitted')
        purchase_invoices = PurchaseInvoice.objects.filter(status='Submitted')

        summary_map = {}

        # 1. સેલ્સ ઇન્વોઇસ પરથી સેલ્સ અને આઉટપુટ GST
        for inv in sales_invoices:
            if not inv.posting_date:
                continue
            m_str = str(inv.posting_date)[:7]

            if m_str not in summary_map:
                summary_map[m_str] = {
                    'month': m_str,
                    'sales': Decimal('0.00'),
                    'purchases': Decimal('0.00'),
                    'output_gst': Decimal('0.00'),
                    'input_gst': Decimal('0.00'),
                }

            summary_map[m_str]['sales'] += Decimal(str(inv.net_total or 0))
            summary_map[m_str]['output_gst'] += Decimal(str(inv.tax_amount or 0))

        # 2. પરચેઝ બિલ પરથી પરચેઝ અને ઇનપુટ GST (ITC)
        for pur in purchase_invoices:
            if not pur.posting_date:
                continue
            m_str = str(pur.posting_date)[:7]

            if m_str not in summary_map:
                summary_map[m_str] = {
                    'month': m_str,
                    'sales': Decimal('0.00'),
                    'purchases': Decimal('0.00'),
                    'output_gst': Decimal('0.00'),
                    'input_gst': Decimal('0.00'),
                }

            summary_map[m_str]['purchases'] += Decimal(str(pur.net_total or 0))
            summary_map[m_str]['input_gst'] += Decimal(str(pur.tax_amount or 0))

        # 3. ફ્રન્ટએન્ડ GSTTab.tsx ના ઇન્ટરફેસ મુજબ એકદમ સાચો ડેટા
        result = []
        for m_str in sorted(summary_map.keys(), reverse=True):
            row = summary_map[m_str]
            out_tax = row['output_gst']
            in_tax = row['input_gst']
            net_diff = out_tax - in_tax

            result.append({
                'id': m_str,
                'month': m_str,
                'sales': float(row['sales']),              # r.sales માટે
                'purchases': float(row['purchases']),      # r.purchases માટે
                'output_gst': float(out_tax),              # r.output_gst માટે
                'input_gst': float(in_tax),                # r.input_gst માટે
                'net_gst': float(net_diff),                # r.net_gst માટે (NaN દૂર થશે)
            })

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

        entries = GLEntry.objects.filter(**filters).order_by('posting_date', 'id')

        report = []
        running_balance = Decimal('0.00')

        for row in entries:
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
        sales_credit = GLEntry.objects.filter(account__icontains="Sales", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00')
        sales_debit = GLEntry.objects.filter(account__icontains="Sales", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')
        net_sales = sales_credit - sales_debit

        stock_in_debit = GLEntry.objects.filter(account__icontains="Stock Received", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')
        stock_in_credit = GLEntry.objects.filter(account__icontains="Stock Received", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00')
        total_purchases = stock_in_debit - stock_in_credit

        input_gst = (GLEntry.objects.filter(account__icontains="Input GST", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')) - \
                    (GLEntry.objects.filter(account__icontains="Input GST", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00'))
        
        output_gst = (GLEntry.objects.filter(account__icontains="Output GST", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00')) - \
                     (GLEntry.objects.filter(account__icontains="Output GST", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00'))

        net_gst = output_gst - input_gst
        gst_payable = max(net_gst, Decimal('0.00'))
        gst_credit = abs(net_gst) if net_gst < Decimal('0.00') else Decimal('0.00')

        debtors = (GLEntry.objects.filter(account__icontains="Debtor", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')) - \
                  (GLEntry.objects.filter(account__icontains="Debtor", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00'))

        # Creditors (Supplier Accounts) અને Creditors બંનેને પકડી લેશે:
        creditors = (GLEntry.objects.filter(account__icontains="Creditor", is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00')) - \
                    (GLEntry.objects.filter(account__icontains="Creditor", is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00'))

        # Bank Account, Cash Account કે Bank બધાનું ડેબિટ - ક્રેડિટ:
        bank_balance = (GLEntry.objects.filter(account__regex=r'(?i)bank|cash', is_cancelled=False).aggregate(s=Sum('debit'))['s'] or Decimal('0.00')) - \
                       (GLEntry.objects.filter(account__regex=r'(?i)bank|cash', is_cancelled=False).aggregate(s=Sum('credit'))['s'] or Decimal('0.00'))

        gross_profit = net_sales - total_purchases

        return Response({
            "income": { "sales": float(net_sales), "total_income": float(net_sales) },
            "expense": { "purchases": float(total_purchases), "total_expense": float(total_purchases) },
            "profit": { "gross_profit": float(gross_profit), "net_profit": float(gross_profit) },
            "gst": { "input_itc": float(input_gst), "output_liability": float(output_gst), "net_payable": float(net_gst) },
            "balance_sheet": {
                "assets": {
                    "bank_cash": float(bank_balance),
                    "debtors_receivable": float(debtors),
                    "gst_credit": float(gst_credit),
                    "total_assets": float(bank_balance + debtors + gst_credit)
                },
                "liabilities": {
                    "creditors_payable": float(creditors),
                    "gst_payable": float(gst_payable),
                    "total_liabilities": float(creditors + gst_payable)
                }
            }
        })


class DashboardSummaryAPIView(APIView):
    def get(self, request):
        total_sales = SalesInvoice.objects.filter(status='Submitted').aggregate(total=Sum('grand_total'))['total'] or 0
        total_purchases = PurchaseInvoice.objects.filter(status='Submitted').aggregate(total=Sum('grand_total'))['total'] or 0
        
        bank_entries = GLEntry.objects.filter(account__in=['Bank Account', 'Cash Account'])
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


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all().order_by('-posting_date', '-id')
    serializer_class = JournalEntrySerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data
        lines_data = data.get('lines', [])

        if len(lines_data) < 2:
            return Response(
                {"error": "Journal Entry requires at least 2 line items (Debit & Credit)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        total_debit = Decimal('0.00')
        total_credit = Decimal('0.00')

        for line in lines_data:
            total_debit += Decimal(str(line.get('debit', 0) or 0))
            total_credit += Decimal(str(line.get('credit', 0) or 0))

        if total_debit <= 0 or total_credit <= 0:
            return Response(
                {"error": "Total Debit and Credit must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if total_debit != total_credit:
            return Response(
                {"error": f"Debit (₹{total_debit}) and Credit (₹{total_credit}) must be equal."},
                status=status.HTTP_400_BAD_REQUEST
            )

        journal_entry = JournalEntry.objects.create(
            voucher_no=data['voucher_no'],
            posting_date=data['posting_date'],
            voucher_type=data.get('voucher_type', 'Journal Entry'),
            narration=data.get('narration', ''),
            total_amount=total_debit
        )

        account_names = [line['account'] for line in lines_data if line.get('account')]

        for line in lines_data:
            debit_amt = Decimal(str(line.get('debit', 0) or 0))
            credit_amt = Decimal(str(line.get('credit', 0) or 0))

            JournalEntryLine.objects.create(
                parent=journal_entry,
                account=line['account'],
                party_type=line.get('party_type') or None,
                party_name=line.get('party_name') or None,
                debit=debit_amt,
                credit=credit_amt
            )

            against_accounts = [acc for acc in account_names if acc != line['account']]
            against_str = ", ".join(against_accounts[:3])

            GLEntry.objects.create(
                posting_date=journal_entry.posting_date,
                account=line['account'],
                party_type=line.get('party_type') or None,
                party=line.get('party_name') or None,
                voucher_type=journal_entry.voucher_type,
                voucher_no=journal_entry.voucher_no,
                against=against_str,
                debit=debit_amt,
                credit=credit_amt,
                remarks=journal_entry.narration or ''
            )

        serializer = self.get_serializer(journal_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        GLEntry.objects.filter(
            voucher_type=instance.voucher_type,
            voucher_no=instance.voucher_no
        ).delete()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PaymentReconciliationAPIView(APIView):
    def get(self, request):
        party_type = request.GET.get('party_type', 'Customer')
        party_name = request.GET.get('party_name')

        if not party_name:
            return Response({"invoices": [], "payments": []})

        if party_type == 'Customer':
            invoices_qs = SalesInvoice.objects.filter(customer_name=party_name, status='Submitted').order_by('posting_date', 'id')
            payments_qs = PaymentEntry.objects.filter(party_type='Customer', party_name=party_name, payment_type='Receive').order_by('posting_date', 'id')
            inv_type_str = 'Sales Invoice'
        else:
            invoices_qs = PurchaseInvoice.objects.filter(supplier_name=party_name, status='Submitted').order_by('posting_date', 'id')
            payments_qs = PaymentEntry.objects.filter(party_type='Supplier', party_name=party_name, payment_type='Pay').order_by('posting_date', 'id')
            inv_type_str = 'Purchase Invoice'

        invoices_data = []
        for inv in invoices_qs:
            allocated = PaymentInvoiceAllocation.objects.filter(
                invoice_type=inv_type_str,
                invoice_id=inv.id
            ).aggregate(s=Sum('allocated_amount'))['s'] or Decimal('0.00')

            inv_no = getattr(inv, 'invoice_number', getattr(inv, 'bill_number', ''))
            outstanding = Decimal(str(inv.grand_total)) - allocated

            if outstanding > Decimal('0.00'):
                invoices_data.append({
                    "id": inv.id,
                    "invoice_number": inv_no,
                    "posting_date": inv.posting_date,
                    "grand_total": float(inv.grand_total),
                    "allocated_amount": float(allocated),
                    "outstanding_amount": float(outstanding)
                })

        payments_data = []
        for p in payments_qs:
            allocated = PaymentInvoiceAllocation.objects.filter(payment=p).aggregate(s=Sum('allocated_amount'))['s'] or Decimal('0.00')
            unallocated = p.paid_amount - allocated

            if unallocated > Decimal('0.00'):
                payments_data.append({
                    "id": p.id,
                    "voucher_no": p.voucher_no,
                    "posting_date": p.posting_date,
                    "mode_of_payment": p.mode_of_payment,
                    "paid_amount": float(p.paid_amount),
                    "allocated_amount": float(allocated),
                    "unallocated_amount": float(unallocated)
                })

        return Response({
            "invoices": invoices_data,
            "payments": payments_data
        })

    @transaction.atomic
    def post(self, request):
        allocations = request.data.get('allocations', [])
        if not allocations:
            return Response({"error": "No allocations provided."}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for item in allocations:
            payment_id = item.get('payment_id')
            invoice_id = item.get('invoice_id')
            invoice_type = item.get('invoice_type')
            invoice_number = item.get('invoice_number')
            amount = Decimal(str(item.get('allocated_amount', 0)))

            if amount <= Decimal('0.00'):
                continue

            payment = PaymentEntry.objects.get(id=payment_id)
            alloc = PaymentInvoiceAllocation.objects.create(
                payment=payment,
                invoice_type=invoice_type,
                invoice_id=invoice_id,
                invoice_number=invoice_number,
                allocated_amount=amount
            )
            created.append(alloc.id)

        return Response({"message": f"Successfully reconciled {len(created)} allocation(s)."}, status=status.HTTP_201_CREATED)