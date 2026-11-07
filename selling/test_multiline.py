"""Round-trip tests for multi-line invoices/bills and payment party typing.

Run with: .venv/Scripts/python.exe manage.py test selling
Uses Django's separate test database, so db.sqlite3 is untouched.
"""
from rest_framework.test import APITestCase
from django.db.models import Sum

from selling.models import Customer, SalesInvoice
from buying.models import Supplier, PurchaseInvoice
from stock.models import Item, StockLedgerEntry
from accounts.models import GLEntry, PaymentEntry


class MultiLineInvoiceTests(APITestCase):
    def setUp(self):
        self.customer = Customer.objects.create(customer_name='Multi Cust')
        self.supplier = Supplier.objects.create(supplier_name='Multi Supp')
        self.item_a = Item.objects.create(item_code='MLA', item_name='Item A', standard_rate=100, current_stock=500)
        self.item_b = Item.objects.create(item_code='MLB', item_name='Item B', standard_rate=50, current_stock=500)

    def test_two_line_invoice_round_trip(self):
        payload = {
            'invoice_number': 'INV-9001',
            'customer': self.customer.id,
            'customer_name': self.customer.customer_name,
            'posting_date': '2026-01-05',
            'net_total': '250.00',
            'tax_amount': '45.00',
            'grand_total': '295.00',
            'status': 'Submitted',
            'items': [
                {'item': self.item_a.id, 'quantity': 2, 'rate': 100, 'amount': '200.00'},
                {'item': self.item_b.id, 'quantity': 1, 'rate': 50, 'amount': '50.00'},
            ],
        }
        res = self.client.post('/api/selling/invoices/', payload, format='json')
        self.assertEqual(res.status_code, 201, res.content)

        inv = SalesInvoice.objects.get(invoice_number='INV-9001')
        self.assertEqual(inv.items.count(), 2, 'both lines must be created')
        self.assertEqual(StockLedgerEntry.objects.filter(voucher_no='INV-9001').count(), 2)
        self.assertEqual(GLEntry.objects.filter(voucher_no='INV-9001').count(), 4)  # Debtors, Sales, CGST, SGST

        # Edit: change quantities AND rates. The old frontend only ever sent
        # items[0], which silently dropped every other line on save.
        update = dict(payload)
        update['status'] = 'Paid'
        update['items'] = [
            {'item': self.item_a.id, 'quantity': 5, 'rate': 110, 'amount': '550.00'},
            {'item': self.item_b.id, 'quantity': 3, 'rate': 60, 'amount': '180.00'},
        ]
        update['net_total'] = '730.00'
        update['tax_amount'] = '131.40'
        update['grand_total'] = '861.40'
        res = self.client.put(f'/api/selling/invoices/{inv.id}/', update, format='json')
        self.assertEqual(res.status_code, 200, res.content)

        inv.refresh_from_db()
        self.assertEqual(inv.items.count(), 2, 'no line may be dropped on edit')
        self.assertEqual(inv.status, 'Paid', 'status must survive an edit')
        lines = sorted(inv.items.values_list('item_id', 'quantity', 'rate'), key=lambda t: t[0])
        self.assertEqual(lines[0][0], self.item_a.id)
        self.assertEqual(float(lines[0][1]), 5.0)
        self.assertEqual(float(lines[0][2]), 110.0)
        self.assertEqual(float(lines[1][1]), 3.0)
        self.assertEqual(float(lines[1][2]), 60.0)
        self.assertEqual(StockLedgerEntry.objects.filter(voucher_no='INV-9001').count(), 2,
                         'ledger must be rebuilt, not appended to')

    def test_multi_line_purchase_round_trip(self):
        payload = {
            'bill_number': 'PUR-9001',
            'supplier': self.supplier.id,
            'supplier_name': self.supplier.supplier_name,
            'posting_date': '2026-01-05',
            'net_total': '250.00',
            'tax_amount': '45.00',
            'grand_total': '295.00',
            'status': 'Submitted',
            'items': [
                {'item': self.item_a.id, 'quantity': 2, 'rate': 100, 'amount': '200.00'},
                {'item': self.item_b.id, 'quantity': 1, 'rate': 50, 'amount': '50.00'},
            ],
        }
        res = self.client.post('/api/buying/invoices/', payload, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        bill = PurchaseInvoice.objects.get(bill_number='PUR-9001')
        self.assertEqual(bill.items.count(), 2)

        update = dict(payload)
        update['items'] = [
            {'item': self.item_b.id, 'quantity': 4, 'rate': 55, 'amount': '220.00'},
        ]
        res = self.client.put(f'/api/buying/invoices/{bill.id}/', update, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        bill.refresh_from_db()
        self.assertEqual(bill.items.count(), 1, 'removing a line must be honoured')

    def test_payment_party_type_is_stored_correctly(self):
        res = self.client.post('/api/accounts/payments/', {
            'voucher_no': 'PAY-9001',
            'payment_type': 'Pay',
            'posting_date': '2026-01-05',
            'party_type': 'Supplier',
            'party_name': self.supplier.supplier_name,
            'mode_of_payment': 'Bank',
            'paid_amount': '500.00',
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        p = PaymentEntry.objects.get(voucher_no='PAY-9001')
        self.assertEqual(p.party_type, 'Supplier')
        # GL must post to Creditors (not Debtors) for a Pay
        self.assertTrue(GLEntry.objects.filter(voucher_no='PAY-9001', account='Creditors').exists())

    def test_output_gst_is_not_zero(self):
        GLEntry.objects.create(posting_date='2026-01-05', account='Output GST',
                               voucher_type='Sales Invoice', voucher_no='INV-GST',
                               credit=1000, debit=0)
        res = self.client.get('/api/accounts/financial-statements/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['gst']['output_liability'], 1000.0)

    def test_sales_invoice_uses_selected_tax_rate(self):
        response = self.client.post('/api/selling/invoices/', {
            'invoice_number': 'INV-5PCT',
            'customer': self.customer.id,
            'customer_name': self.customer.customer_name,
            'posting_date': '2026-01-05',
            'tax_rate': '5',
            'items': [
                {'item': self.item_a.id, 'quantity': 1, 'rate': 100},
            ],
        }, format='json')

        self.assertEqual(response.status_code, 201, response.content)
        invoice = SalesInvoice.objects.get(invoice_number='INV-5PCT')
        self.assertEqual(invoice.tax_rate, 5)
        self.assertEqual(invoice.tax_amount, 5)
        self.assertEqual(invoice.grand_total, 105)
        output_gst = GLEntry.objects.filter(
            voucher_no='INV-5PCT', account='Output GST'
        ).aggregate(total=Sum('credit'))['total']
        self.assertEqual(output_gst, 5)

        response = self.client.put(f'/api/selling/invoices/{invoice.id}/', {
            'invoice_number': invoice.invoice_number,
            'customer': self.customer.id,
            'customer_name': self.customer.customer_name,
            'posting_date': '2026-01-05',
            'tax_rate': '12',
            'items': [
                {'item': self.item_a.id, 'quantity': 1, 'rate': 100},
            ],
        }, format='json')

        self.assertEqual(response.status_code, 200, response.content)
        invoice.refresh_from_db()
        self.assertEqual(invoice.tax_rate, 12)
        self.assertEqual(invoice.tax_amount, 12)
        self.assertEqual(invoice.grand_total, 112)
        output_gst = GLEntry.objects.filter(
            voucher_no='INV-5PCT', account='Output GST'
        ).aggregate(total=Sum('credit'))['total']
        self.assertEqual(output_gst, 12)
