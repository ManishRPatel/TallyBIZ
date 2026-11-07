from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from decimal import Decimal
from .models import Item, StockLedgerEntry
from .serializers import ItemSerializer

class ItemListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ItemSerializer

    def get_queryset(self):
        # દરેક Item નો Current Stock હંમેશાં Stock Ledger ના સરવાળા પરથી તાજો કરો
        items = Item.objects.all().order_by('-id')
        for it in items:
            net_qty = StockLedgerEntry.objects.filter(item=it).aggregate(s=Sum('actual_qty'))['s'] or Decimal('0.00')
            if it.current_stock != net_qty:
                it.current_stock = net_qty
                it.save(update_fields=['current_stock'])
        return items

class ItemRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

class StockLedgerAPIView(APIView):
    def get(self, request):
        item_id = request.GET.get('item_id')
        filters = {}
        if item_id and item_id != 'all':
            filters['item_id'] = item_id

        # કાલક્રમિક (Chronological) સાચો ક્રમ
        entries = StockLedgerEntry.objects.filter(**filters).select_related('item').order_by('posting_date', '-actual_qty', 'id')

        report = []
        running_balances = {}
        last_known_rates = {}

        for row in entries:
            it_id = row.item_id
            if it_id not in running_balances:
                running_balances[it_id] = Decimal('0.00')

            running_balances[it_id] += row.actual_qty

            qty = row.actual_qty
            in_qty = qty if qty > Decimal('0.00') else Decimal('0.00')
            out_qty = abs(qty) if qty < Decimal('0.00') else Decimal('0.00')

            # Valuation rate logic: જો 0 હોય તો પાછલો રેટ અથવા standard_rate લેવો
            rate = row.valuation_rate
            if rate <= Decimal('0.00'):
                rate = last_known_rates.get(it_id, row.item.standard_rate or Decimal('0.00'))
            else:
                last_known_rates[it_id] = rate

            bal_qty = running_balances[it_id]
            bal_value = bal_qty * rate

            report.append({
                'id': row.id,
                'posting_date': row.posting_date,
                'item_code': row.item.item_code,
                'item_name': row.item.item_name,
                'voucher_type': row.voucher_type,
                'voucher_no': row.voucher_no,
                'in_qty': float(in_qty),
                'out_qty': float(out_qty),
                'balance_qty': float(bal_qty),
                'valuation_rate': float(rate),
                'balance_value': float(bal_value)
            })

        # યુઝરને જોવા માટે નવી એન્ટ્રી ઉપર દેખાય તે માટે રિવર્સ
        report.reverse()
        return Response(report)