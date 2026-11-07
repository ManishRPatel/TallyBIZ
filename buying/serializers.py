from rest_framework import serializers
from django.db import transaction
from decimal import Decimal
from .models import Supplier, PurchaseInvoice, PurchaseInvoiceItem, DebitNote, DebitNoteItem
from stock.models import Item, StockLedgerEntry
from accounts.models import GLEntry
from accounts.services import make_gl_entries


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class PurchaseInvoiceItemSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0.0)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.0)
    is_foc = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = PurchaseInvoiceItem
        fields = [
            'id', 'item', 'quantity', 'rate', 
            'discount_percentage', 'discount_amount', 'is_foc', 'amount'
        ]


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

        if self.instance is None and (not items_data or len(items_data) == 0):
            raise serializers.ValidationError({"items": "At least one line item is required."})

        if items_data:
            calc_net = Decimal('0.00')
            for row in items_data:
                qty = Decimal(str(row.get('quantity', 0)))
                is_foc = row.get('is_foc', False)
                rate = Decimal('0.00') if is_foc else Decimal(str(row.get('rate', 0)))
                disc_pct = Decimal('0.00') if is_foc else Decimal(str(row.get('discount_percentage', 0)))

                if qty <= Decimal('0.00'):
                    raise serializers.ValidationError({"items": "Quantity must be greater than zero."})
                if rate < Decimal('0.00'):
                    raise serializers.ValidationError({"items": "Rate cannot be negative."})

                base_amt = qty * rate
                disc_amt = (base_amt * (disc_pct / Decimal('100'))).quantize(Decimal('0.01'))
                line_net = max(Decimal('0.00'), base_amt - disc_amt)

                row['rate'] = rate
                row['discount_percentage'] = disc_pct
                row['discount_amount'] = disc_amt
                row['amount'] = line_net
                calc_net += line_net

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

            # જો ડિસ્કાઉન્ટ હોય તો અસરકારક યુનિટ રેટ, અથવા FOC હોય તો standard_rate વાપરો
            line_amt = Decimal(str(item_data.get('amount', 0)))
            effective_rate = (line_amt / qty).quantize(Decimal('0.01')) if qty > Decimal('0.00') else Decimal('0.00')
            val_rate = effective_rate if effective_rate > Decimal('0.00') else item_obj.standard_rate

            StockLedgerEntry.objects.create(
                posting_date=invoice.posting_date,
                item=item_obj,
                voucher_type='Purchase Invoice',
                voucher_no=invoice.bill_number,
                actual_qty=qty,
                qty_after_transaction=new_stock,
                valuation_rate=val_rate
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

class DebitNoteItemSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)

    class Meta:
        model = DebitNoteItem
        fields = ['id', 'item', 'quantity', 'rate', 'amount']


class DebitNoteSerializer(serializers.ModelSerializer):
    items = DebitNoteItemSerializer(many=True)

    class Meta:
        model = DebitNote
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        net_total = Decimal('0.00')
        for item in items_data:
            line_amt = Decimal(str(item['quantity'])) * Decimal(str(item['rate']))
            item['amount'] = line_amt
            net_total += line_amt

        tax_amount = (net_total * Decimal('0.18')).quantize(Decimal('0.01'))
        grand_total = net_total + tax_amount

        debit_note = DebitNote.objects.create(
            net_total=net_total,
            tax_amount=tax_amount,
            grand_total=grand_total,
            status='Submitted',
            **validated_data
        )

        for item_data in items_data:
            DebitNoteItem.objects.create(debit_note=debit_note, **item_data)
            
            # Stock Outward (Purchase Return માઇનસ થશે) સાથે લોક
            item_obj = Item.objects.select_for_update().get(id=item_data['item'].id)
            item_obj.current_stock -= item_data['quantity']
            item_obj.save()

            StockLedgerEntry.objects.create(
                posting_date=debit_note.posting_date,
                item=item_obj,
                voucher_type="Debit Note",
                voucher_no=debit_note.debit_note_number,
                actual_qty=-Decimal(str(item_data['quantity'])),  # માઇનસ (-) કવોન્ટિટી
                qty_after_transaction=item_obj.current_stock,
                valuation_rate=item_obj.standard_rate
            )

        # GL Entries for Debit Note (Creditors & Purchase Return)
        gl_map = [
            {
                "posting_date": debit_note.posting_date,
                "account": "Creditors",
                "party_type": "Supplier",
                "party": debit_note.supplier_name,
                "voucher_type": "Debit Note",
                "voucher_no": debit_note.debit_note_number,
                "against": "Purchase Return",
                "debit": debit_note.grand_total,
                "credit": Decimal('0.00'),
                "remarks": f"Debit note reduction for {debit_note.debit_note_number}"
            },
            {
                "posting_date": debit_note.posting_date,
                "account": "Stock Received But Not Billed",  # Purchase Return account તરીકે
                "party_type": None,
                "party": None,
                "voucher_type": "Debit Note",
                "voucher_no": debit_note.debit_note_number,
                "against": debit_note.supplier_name,
                "debit": Decimal('0.00'),
                "credit": debit_note.net_total,
                "remarks": f"Purchase Return to {debit_note.supplier_name}"
            }
        ]
        make_gl_entries(gl_map)
        return debit_note
    