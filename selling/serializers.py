from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from .models import Customer, SalesInvoice, SalesInvoiceItem
from stock.models import Item, StockLedgerEntry
from accounts.models import GLEntry
from accounts.services import make_gl_entries


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class SalesInvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesInvoiceItem
        fields = ['id', 'item', 'quantity', 'rate', 'amount']


class SalesInvoiceSerializer(serializers.ModelSerializer):
    items = SalesInvoiceItemSerializer(many=True)

    class Meta:
        model = SalesInvoice
        fields = [
            'id', 
            'invoice_number', 
            'customer', 
            'customer_name', 
            'posting_date', 
            'due_date', 
            'net_total', 
            'tax_amount', 
            'grand_total', 
            'status', 
            'items'
        ]

    def validate(self, data):
        items_data = data.get('items')

        # Defect #2 Fix: Items hova farajiyat chhe
        if self.instance is None and (not items_data or len(items_data) == 0):
            raise serializers.ValidationError({"items": "At least one item is required."})

        if items_data:
            # Defect #6 Fix: Stock negative na thavo joiye
            for row in items_data:
                item_obj = row['item']
                qty = Decimal(str(row['quantity']))
                if qty <= Decimal('0.00'):
                    raise serializers.ValidationError({"items": "Quantity must be greater than zero."})

                available = item_obj.current_stock
                if self.instance:
                    old_item = self.instance.items.filter(item=item_obj).first()
                    if old_item:
                        available += old_item.quantity

                if qty > available:
                    raise serializers.ValidationError({
                        "items": f"Insufficient stock for '{item_obj.item_name}'. Available: {available}, Requested: {qty}."
                    })

            # Defect #4 Fix: Net total ane Grand total nu calculation backend par check karo (400 validation error)
            calc_net = sum(Decimal(str(r['quantity'])) * Decimal(str(r['rate'])) for r in items_data)
            tax_amt = Decimal(str(data.get('tax_amount', 0)))
            calc_grand = calc_net + tax_amt
            
            data['net_total'] = calc_net
            data['grand_total'] = calc_grand

        return data

    def _post_stock_and_gl(self, invoice, items_data):
        for item_data in items_data:
            SalesInvoiceItem.objects.create(invoice=invoice, **item_data)
            item_obj = item_data['item']
            qty = Decimal(str(item_data['quantity']))
            new_stock = item_obj.current_stock - qty
            item_obj.current_stock = new_stock
            item_obj.save()

            StockLedgerEntry.objects.create(
                posting_date=invoice.posting_date,
                item=item_obj,
                voucher_type='Sales Invoice',
                voucher_no=invoice.invoice_number,
                actual_qty=-qty,
                qty_after_transaction=new_stock,
                valuation_rate=item_data['rate']
            )

        gl_map = [
            {
                "posting_date": invoice.posting_date,
                "account": "Debtors",
                "party_type": "Customer",
                "party": invoice.customer_name,
                "voucher_type": "Sales Invoice",
                "voucher_no": invoice.invoice_number,
                "against": "Sales Income",
                "debit": invoice.grand_total,
                "credit": Decimal('0.00'),
                "remarks": f"Sales Invoice {invoice.invoice_number}"
            },
            {
                "posting_date": invoice.posting_date,
                "account": "Sales Income",
                "party_type": None,
                "party": None,
                "voucher_type": "Sales Invoice",
                "voucher_no": invoice.invoice_number,
                "against": invoice.customer_name,
                "debit": Decimal('0.00'),
                "credit": invoice.net_total,
                "remarks": f"Sales Income for {invoice.invoice_number}"
            }
        ]

        if invoice.tax_amount and invoice.tax_amount > Decimal('0.00'):
            gl_map.append({
                "posting_date": invoice.posting_date,
                "account": "Output GST",
                "party_type": None,
                "party": None,
                "voucher_type": "Sales Invoice",
                "voucher_no": invoice.invoice_number,
                "against": invoice.customer_name,
                "debit": Decimal('0.00'),
                "credit": invoice.tax_amount,
                "remarks": f"Output GST on {invoice.invoice_number}"
            })

        make_gl_entries(gl_map)

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = SalesInvoice.objects.create(**validated_data)
        self._post_stock_and_gl(invoice, items_data)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Jo items na moklya hoy to update atkavi do (Defect #2 Fix)
        if items_data is None:
            raise serializers.ValidationError({"items": "Items list is required for invoice update."})

        # 1. Juno stock pacho vadharo
        for old_item in instance.items.all():
            item_obj = old_item.item
            item_obj.current_stock += old_item.quantity
            item_obj.save()

        StockLedgerEntry.objects.filter(voucher_type='Sales Invoice', voucher_no=instance.invoice_number).delete()
        GLEntry.objects.filter(voucher_type='Sales Invoice', voucher_no=instance.invoice_number).delete()
        instance.items.all().delete()

        # 2. Navi details save karo
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 3. Navo stock ane ledger banavo
        self._post_stock_and_gl(instance, items_data)
        return instance