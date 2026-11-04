from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from .models import Supplier, PurchaseInvoice, PurchaseInvoiceItem
from stock.models import Item, StockLedgerEntry
from accounts.models import GLEntry
from accounts.services import make_gl_entries


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class PurchaseInvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseInvoiceItem
        fields = ['id', 'item', 'quantity', 'rate', 'amount']


class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    items = PurchaseInvoiceItemSerializer(many=True)

    class Meta:
        model = PurchaseInvoice
        fields = [
            'id', 
            'bill_number', 
            'supplier', 
            'supplier_name', 
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

        # Defect #2 Fix: Items હોવા ફરજિયાત છે
        if self.instance is None and (not items_data or len(items_data) == 0):
            raise serializers.ValidationError({"items": "At least one line item is required."})

        if items_data:
            for row in items_data:
                qty = Decimal(str(row['quantity']))
                rate = Decimal(str(row['rate']))
                if qty <= Decimal('0.00'):
                    raise serializers.ValidationError({"items": "Quantity must be greater than zero."})
                if rate < Decimal('0.00'):
                    raise serializers.ValidationError({"items": "Rate cannot be negative."})

            # Defect #4 Fix: Net Total અને Grand Total ની ગણતરી બેકએન્ડ પર ચોકસાઈથી સેટ કરો
            calc_net = sum(Decimal(str(r['quantity'])) * Decimal(str(r['rate'])) for r in items_data)
            tax_amt = Decimal(str(data.get('tax_amount', 0)))
            calc_grand = calc_net + tax_amt

            data['net_total'] = calc_net
            data['grand_total'] = calc_grand

        return data

    def _post_stock_and_gl(self, invoice, items_data):
        for item_data in items_data:
            PurchaseInvoiceItem.objects.create(invoice=invoice, **item_data)
            item_obj = item_data['item']
            qty = Decimal(str(item_data['quantity']))
            new_stock = item_obj.current_stock + qty
            item_obj.current_stock = new_stock
            item_obj.save()

            StockLedgerEntry.objects.create(
                posting_date=invoice.posting_date,
                item=item_obj,
                voucher_type='Purchase Invoice',
                voucher_no=invoice.bill_number,
                actual_qty=qty,
                qty_after_transaction=new_stock,
                valuation_rate=item_data['rate']
            )

        gl_map = [
            {
                "posting_date": invoice.posting_date,
                "account": "Stock Received But Not Billed",
                "party_type": None,
                "party": None,
                "voucher_type": "Purchase Invoice",
                "voucher_no": invoice.bill_number,
                "against": invoice.supplier_name,
                "debit": invoice.net_total,
                "credit": Decimal('0.00'),
                "remarks": f"Purchase Bill {invoice.bill_number}"
            },
            {
                "posting_date": invoice.posting_date,
                "account": "Creditors",
                "party_type": "Supplier",
                "party": invoice.supplier_name,
                "voucher_type": "Purchase Invoice",
                "voucher_no": invoice.bill_number,
                "against": "Stock Received",
                "debit": Decimal('0.00'),
                "credit": invoice.grand_total,
                "remarks": f"Payable for {invoice.bill_number}"
            }
        ]

        if invoice.tax_amount and invoice.tax_amount > Decimal('0.00'):
            gl_map.append({
                "posting_date": invoice.posting_date,
                "account": "Input GST",
                "party_type": None,
                "party": None,
                "voucher_type": "Purchase Invoice",
                "voucher_no": invoice.bill_number,
                "against": invoice.supplier_name,
                "debit": invoice.tax_amount,
                "credit": Decimal('0.00'),
                "remarks": f"Input GST ITC on {invoice.bill_number}"
            })

        make_gl_entries(gl_map)

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = PurchaseInvoice.objects.create(**validated_data)
        self._post_stock_and_gl(invoice, items_data)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # જો items ન મોકલ્યા હોય તો update અટકાવો (Defect #2 Fix)
        if items_data is None:
            raise serializers.ValidationError({"items": "Items list is required for purchase bill update."})

        # 1. જૂની ખરીદી રદ કરવા સ્ટોક પાછો ઘટાડો
        for old_item in instance.items.all():
            item_obj = old_item.item
            item_obj.current_stock -= old_item.quantity
            item_obj.save()

        StockLedgerEntry.objects.filter(voucher_type='Purchase Invoice', voucher_no=instance.bill_number).delete()
        GLEntry.objects.filter(voucher_type='Purchase Invoice', voucher_no=instance.bill_number).delete()
        instance.items.all().delete()

        # 2. નવી વિગતો સેવ કરો
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 3. નવો સ્ટોક અને નવું લેજર બનાવો
        self._post_stock_and_gl(instance, items_data)
        return instance