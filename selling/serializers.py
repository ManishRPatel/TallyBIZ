from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from .models import Customer, SalesInvoice, SalesInvoiceItem
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

            StockLedgerEntry.objects.create(
                posting_date=invoice.posting_date,
                item=item_obj,
                voucher_type="Sales Invoice",
                voucher_no=invoice.invoice_number,
                actual_qty=-Decimal(str(item_data['quantity'])),
                qty_after_transaction=item_obj.current_stock
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

                StockLedgerEntry.objects.create(
                    posting_date=instance.posting_date,
                    item=itm,
                    voucher_type="Sales Invoice",
                    voucher_no=instance.invoice_number,
                    actual_qty=-Decimal(str(item['quantity'])),
                    qty_after_transaction=itm.current_stock
                )

        tax_rate = Decimal(str(instance.tax_rate if hasattr(instance, 'tax_rate') and instance.tax_rate else '18')) / Decimal('100')
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