from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from .models import Customer, SalesInvoice, SalesInvoiceItem, CreditNote, CreditNoteItem
from stock.models import Item, StockLedgerEntry
from accounts.models import GLEntry
from accounts.services import make_gl_entries


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class SalesInvoiceItemSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0.0)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.0)
    is_foc = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = SalesInvoiceItem
        fields = ['id', 'item', 'quantity', 'rate', 'discount_percentage', 'discount_amount', 'is_foc', 'amount']


class SalesInvoiceSerializer(serializers.ModelSerializer):
    items = SalesInvoiceItemSerializer(many=True)

    class Meta:
        model = SalesInvoice
        fields = '__all__'

    def validate(self, data):
        items_data = data.get('items', [])
        if not items_data:
            raise serializers.ValidationError({"items": "At least one item is required."})

        # 1. એક જ આઇટમ મલ્ટિપલ લાઇનમાં હોય તો એકત્રિત (aggregate) કરો
        req_totals = {}
        for row in items_data:
            item_obj = row['item']
            qty = Decimal(str(row['quantity']))
            if qty <= Decimal('0'):
                raise serializers.ValidationError({"items": "Quantity must be greater than zero."})
            req_totals[item_obj.id] = req_totals.get(item_obj.id, Decimal('0')) + qty

        # 2. જો અપડેટ હોય તો વર્તમાન ઇન્વોઇસમાં પહેલેથી બાદ થયેલો સ્ટોક ઉમેરો
        existing_qty = {}
        if self.instance:
            for old_row in self.instance.items.all():
                existing_qty[old_row.item_id] = existing_qty.get(old_row.item_id, Decimal('0')) + old_row.quantity

        # 3. ડેટાબેઝમાંથી ફ્રેશ સ્ટોક ચેક કરો
        for item_id, total_req in req_totals.items():
            fresh_item = Item.objects.get(id=item_id)
            available = fresh_item.current_stock + existing_qty.get(item_id, Decimal('0'))
            if total_req > available:
                raise serializers.ValidationError({
                    "items": f"Insufficient stock for '{fresh_item.item_name}'. Available: {available}, Requested: {total_req}"
                })

        return data

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # ફ્રન્ટએન્ડમાંથી આવેલા ટોટલ કાઢીને અહીં ફરીથી સચોટ ગણતરી કરવી
        validated_data.pop('net_total', None)
        validated_data.pop('tax_amount', None)
        validated_data.pop('grand_total', None)

        net_total = Decimal('0.00')
        for item in items_data:
            qty = Decimal(str(item.get('quantity', 0)))
            is_foc = item.get('is_foc', False)
            
            if is_foc:
                item['rate'] = Decimal('0.00')
                item['discount_percentage'] = Decimal('0.00')
                item['discount_amount'] = Decimal('0.00')
                item['amount'] = Decimal('0.00')
            else:
                rate = Decimal(str(item.get('rate', 0)))
                disc_pct = Decimal(str(item.get('discount_percentage', 0)))
                base_amt = qty * rate
                disc_amt = (base_amt * (disc_pct / Decimal('100'))).quantize(Decimal('0.01'))
                taxable_amt = max(Decimal('0.00'), base_amt - disc_amt)

                item['discount_amount'] = disc_amt
                item['amount'] = taxable_amt
                net_total += taxable_amt

        tax_rate = Decimal(str(validated_data.get('tax_rate', '18'))) / Decimal('100')
        tax_amount = (net_total * tax_rate).quantize(Decimal('0.01'))
        grand_total = net_total + tax_amount

        invoice = SalesInvoice.objects.create(
            net_total=net_total,
            tax_amount=tax_amount,
            grand_total=grand_total,
            status=validated_data.pop('status', 'Submitted'),
            **validated_data
        )

        for item_data in items_data:
            SalesInvoiceItem.objects.create(invoice=invoice, **item_data)
            
            # Stock Deduction & Ledger Entry with lock
            item_obj = Item.objects.select_for_update().get(id=item_data['item'].id)
            item_obj.current_stock -= item_data['quantity']
            item_obj.save()

            val_rate = item_obj.standard_rate if item_obj.standard_rate > Decimal('0.00') else Decimal(str(item_data.get('rate', 0)))

            StockLedgerEntry.objects.create(
                posting_date=invoice.posting_date,
                item=item_obj,
                voucher_type="Sales Invoice",
                voucher_no=invoice.invoice_number,
                actual_qty=-Decimal(str(item_data['quantity'])),
                qty_after_transaction=item_obj.current_stock,
                valuation_rate=val_rate
            )

        self._post_gl(invoice)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        validated_data.pop('net_total', None)
        validated_data.pop('tax_amount', None)
        validated_data.pop('grand_total', None)

        # 1. જૂનો સ્ટોક અને જૂની એન્ટ્રીઓ રિવર્સ કરો
        for old_row in instance.items.all():
            itm = Item.objects.select_for_update().get(id=old_row.item_id)
            itm.current_stock += old_row.quantity
            itm.save()

        StockLedgerEntry.objects.filter(
            voucher_type="Sales Invoice", voucher_no=instance.invoice_number
        ).delete()
        GLEntry.objects.filter(
            voucher_type="Sales Invoice", voucher_no=instance.invoice_number
        ).delete()
        instance.items.all().delete()

        # 2. નવા ડેટા સાથે ફિલ્ડ્સ અપડેટ કરો
        for attr, val in validated_data.items():
            setattr(instance, attr, val)

        net_total = Decimal('0.00')
        if items_data:
            for item in items_data:
                qty = Decimal(str(item.get('quantity', 0)))
                is_foc = item.get('is_foc', False)

                if is_foc:
                    item['rate'] = Decimal('0.00')
                    item['discount_percentage'] = Decimal('0.00')
                    item['discount_amount'] = Decimal('0.00')
                    item['amount'] = Decimal('0.00')
                else:
                    rate = Decimal(str(item.get('rate', 0)))
                    disc_pct = Decimal(str(item.get('discount_percentage', 0)))
                    base_amt = qty * rate
                    disc_amt = (base_amt * (disc_pct / Decimal('100'))).quantize(Decimal('0.01'))
                    taxable_amt = max(Decimal('0.00'), base_amt - disc_amt)

                    item['discount_amount'] = disc_amt
                    item['amount'] = taxable_amt
                    net_total += taxable_amt

                SalesInvoiceItem.objects.create(invoice=instance, **item)

                itm = Item.objects.select_for_update().get(id=item['item'].id)
                itm.current_stock -= item['quantity']
                itm.save()

                val_rate = itm.standard_rate if itm.standard_rate > Decimal('0.00') else Decimal(str(item.get('rate', 0)))

                StockLedgerEntry.objects.create(
                    posting_date=instance.posting_date,
                    item=itm,
                    voucher_type="Sales Invoice",
                    voucher_no=instance.invoice_number,
                    actual_qty=-Decimal(str(item['quantity'])),
                    qty_after_transaction=itm.current_stock,
                    valuation_rate=val_rate
                )

        tax_rate = Decimal(str(instance.tax_rate if instance.tax_rate is not None else '18')) / Decimal('100')
        instance.net_total = net_total
        instance.tax_amount = (net_total * tax_rate).quantize(Decimal('0.01'))
        instance.grand_total = instance.net_total + instance.tax_amount
        instance.save()

        self._post_gl(instance)
        return instance

    def _post_gl(self, invoice):
        is_inter_state = False
        if hasattr(invoice, 'customer') and invoice.customer and invoice.customer.gstin:
            if not invoice.customer.gstin.startswith('24'):
                is_inter_state = True

        half_tax = (invoice.tax_amount / Decimal('2')).quantize(Decimal('0.01'))

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
                "remarks": f"Sales to {invoice.customer_name}"
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
                "remarks": "Goods Sold"
            }
        ]

        if is_inter_state:
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
                "remarks": "IGST Output 18%"
            })
        else:
            gl_map.extend([
                {
                    "posting_date": invoice.posting_date,
                    "account": "Output GST",
                    "party_type": None,
                    "party": None,
                    "voucher_type": "Sales Invoice",
                    "voucher_no": invoice.invoice_number,
                    "against": invoice.customer_name,
                    "debit": Decimal('0.00'),
                    "credit": half_tax,
                    "remarks": "CGST Output 9%"
                },
                {
                    "posting_date": invoice.posting_date,
                    "account": "Output GST",
                    "party_type": None,
                    "party": None,
                    "voucher_type": "Sales Invoice",
                    "voucher_no": invoice.invoice_number,
                    "against": invoice.customer_name,
                    "debit": Decimal('0.00'),
                    "credit": half_tax,
                    "remarks": "SGST Output 9%"
                }
            ])

        make_gl_entries(gl_map)

class CreditNoteItemSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)

    class Meta:
        model = CreditNoteItem
        fields = ['id', 'item', 'quantity', 'rate', 'amount']


class CreditNoteSerializer(serializers.ModelSerializer):
    items = CreditNoteItemSerializer(many=True)

    class Meta:
        model = CreditNote
        fields = '__all__'

    def validate(self, attrs):
        invoice = attrs.get(
            'sales_invoice',
            self.instance.sales_invoice if self.instance else None
        )
        if invoice is None:
            return attrs

        invoiced_quantities = {}
        for invoice_item in invoice.items.all():
            invoiced_quantities[invoice_item.item_id] = (
                invoiced_quantities.get(invoice_item.item_id, Decimal('0'))
                + invoice_item.quantity
            )

        returned_quantities = {}
        existing_notes = CreditNote.objects.filter(sales_invoice=invoice)
        if self.instance:
            existing_notes = existing_notes.exclude(pk=self.instance.pk)
        for note_item in CreditNoteItem.objects.filter(credit_note__in=existing_notes):
            returned_quantities[note_item.item_id] = (
                returned_quantities.get(note_item.item_id, Decimal('0'))
                + note_item.quantity
            )

        items_data = attrs.get('items')
        if items_data is None:
            if not self.instance:
                return attrs
            items_data = [
                {'item': note_item.item, 'quantity': note_item.quantity}
                for note_item in self.instance.items.select_related('item')
            ]

        requested_quantities = {}
        for item_data in items_data:
            item_obj = item_data['item']
            requested_quantities[item_obj.id] = (
                requested_quantities.get(item_obj.id, Decimal('0'))
                + item_data['quantity']
            )

        errors = []
        for item_id, requested_quantity in requested_quantities.items():
            invoice_quantity = invoiced_quantities.get(item_id, Decimal('0'))
            already_returned = returned_quantities.get(item_id, Decimal('0'))
            remaining_quantity = invoice_quantity - already_returned
            if requested_quantity > remaining_quantity:
                item_name = next(
                    item_data['item'].item_name
                    for item_data in items_data
                    if item_data['item'].id == item_id
                )
                errors.append(
                    f'{item_name}: requested return quantity {requested_quantity} '
                    f'exceeds the remaining invoice quantity {remaining_quantity}.'
                )
        if errors:
            raise serializers.ValidationError({'items': errors})
        return attrs

    def _save_entries(self, credit_note, items_data, replacing=False):
        net_total = Decimal('0.00')
        for item in items_data:
            line_amt = Decimal(str(item['quantity'])) * Decimal(str(item['rate']))
            item['amount'] = line_amt
            net_total += line_amt

        tax_amount = (net_total * Decimal('0.18')).quantize(Decimal('0.01'))
        grand_total = net_total + tax_amount

        if replacing:
            for old_item in credit_note.items.select_related('item'):
                old_item.item.current_stock -= old_item.quantity
                old_item.item.save(update_fields=['current_stock'])

            StockLedgerEntry.objects.filter(
                voucher_type='Credit Note',
                voucher_no=credit_note.credit_note_number
            ).delete()
            GLEntry.objects.filter(
                voucher_type='Credit Note',
                voucher_no=credit_note.credit_note_number
            ).delete()
            credit_note.items.all().delete()

        for item_data in items_data:
            CreditNoteItem.objects.create(credit_note=credit_note, **item_data)
            item_obj = Item.objects.select_for_update().get(id=item_data['item'].id)
            item_obj.current_stock += item_data['quantity']
            item_obj.save(update_fields=['current_stock'])

            StockLedgerEntry.objects.create(
                posting_date=credit_note.posting_date,
                item=item_obj,
                voucher_type="Credit Note",
                voucher_no=credit_note.credit_note_number,
                actual_qty=Decimal(str(item_data['quantity'])),  # વતા (+) કવોન્ટિટી
                qty_after_transaction=item_obj.current_stock,
                valuation_rate=item_obj.standard_rate
            )

        credit_note.net_total = net_total
        credit_note.tax_amount = tax_amount
        credit_note.grand_total = grand_total
        credit_note.status = 'Submitted'
        credit_note.save()

        gl_map = [
            {
                "posting_date": credit_note.posting_date,
                "account": "Sales Income",  # Sales Return account તરીકે
                "party_type": None,
                "party": None,
                "voucher_type": "Credit Note",
                "voucher_no": credit_note.credit_note_number,
                "against": credit_note.customer_name,
                "debit": credit_note.net_total,
                "credit": Decimal('0.00'),
                "remarks": f"Sales Return from {credit_note.customer_name}"
            },
            {
                "posting_date": credit_note.posting_date,
                "account": "Output GST",
                "party_type": None,
                "party": None,
                "voucher_type": "Credit Note",
                "voucher_no": credit_note.credit_note_number,
                "against": credit_note.customer_name,
                "debit": credit_note.tax_amount,
                "credit": Decimal('0.00'),
                "remarks": f"Output GST reversal for {credit_note.credit_note_number}"
            },
            {
                "posting_date": credit_note.posting_date,
                "account": "Debtors",
                "party_type": "Customer",
                "party": credit_note.customer_name,
                "voucher_type": "Credit Note",
                "voucher_no": credit_note.credit_note_number,
                "against": "Sales Income",
                "debit": Decimal('0.00'),
                "credit": credit_note.grand_total,
                "remarks": f"Credit note reduction for {credit_note.credit_note_number}"
            }
        ]
        make_gl_entries(gl_map)
        return credit_note

    @transaction.atomic
    def create(self, validated_data):
        invoice = validated_data.get('sales_invoice')
        if invoice:
            SalesInvoice.objects.select_for_update().get(pk=invoice.pk)
        self.validate(validated_data)
        items_data = validated_data.pop('items')
        credit_note = CreditNote.objects.create(**validated_data)
        return self._save_entries(credit_note, items_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        invoice = validated_data.get('sales_invoice', instance.sales_invoice)
        if invoice:
            SalesInvoice.objects.select_for_update().get(pk=invoice.pk)
        self.validate(validated_data)
        items_data = validated_data.pop('items', None)
        if items_data is None:
            items_data = [
                {
                    'item': item.item,
                    'quantity': item.quantity,
                    'rate': item.rate
                }
                for item in instance.items.all()
            ]
        old_note_number = instance.credit_note_number
        new_note_number = validated_data.get('credit_note_number', old_note_number)
        if new_note_number != old_note_number:
            StockLedgerEntry.objects.filter(
                voucher_type='Credit Note',
                voucher_no=old_note_number
            ).delete()
            GLEntry.objects.filter(
                voucher_type='Credit Note',
                voucher_no=old_note_number
            ).delete()
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return self._save_entries(instance, items_data, replacing=True)