from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from .models import PaymentEntry
from .services import make_gl_entries

class PaymentEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentEntry
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        payment = PaymentEntry.objects.create(**validated_data)
        
        # Bank / Cash Account નક્કી કરો
        bank_or_cash = "Bank Account" if payment.mode_of_payment in ['Bank', 'Cheque'] else "Cash Account"

        if payment.payment_type == 'Receive':
            # ગ્રાહક પાસેથી પૈસા આવ્યા:
            # 1. Bank/Cash Debit (+ પૈસા વધ્યા)
            # 2. Debtors Credit (- લેણું ઘટ્યું)
            gl_map = [
                {
                    "posting_date": payment.posting_date,
                    "account": bank_or_cash,
                    "party_type": None,
                    "party": None,
                    "voucher_type": "Payment Entry",
                    "voucher_no": payment.voucher_no,
                    "against": payment.party_name,
                    "debit": payment.paid_amount,
                    "credit": Decimal('0.00'),
                    "remarks": f"Received via {payment.mode_of_payment} (Ref: {payment.reference_no or '-'})"
                },
                {
                    "posting_date": payment.posting_date,
                    "account": "Debtors",
                    "party_type": "Customer",
                    "party": payment.party_name,
                    "voucher_type": "Payment Entry",
                    "voucher_no": payment.voucher_no,
                    "against": bank_or_cash,
                    "debit": Decimal('0.00'),
                    "credit": payment.paid_amount,
                    "remarks": f"Payment from {payment.party_name}"
                }
            ]
        else:
            # સપ્લાયરને ચુકવણી (Pay):
            gl_map = [
                {
                    "posting_date": payment.posting_date,
                    "account": "Creditors",
                    "party_type": "Supplier",
                    "party": payment.party_name,
                    "voucher_type": "Payment Entry",
                    "voucher_no": payment.voucher_no,
                    "against": bank_or_cash,
                    "debit": payment.paid_amount,
                    "credit": Decimal('0.00'),
                    "remarks": f"Payment to {payment.party_name}"
                },
                {
                    "posting_date": payment.posting_date,
                    "account": bank_or_cash,
                    "party_type": None,
                    "party": None,
                    "voucher_type": "Payment Entry",
                    "voucher_no": payment.voucher_no,
                    "against": payment.party_name,
                    "debit": Decimal('0.00'),
                    "credit": payment.paid_amount,
                    "remarks": f"Paid via {payment.mode_of_payment}"
                }
            ]

        make_gl_entries(gl_map)
        return payment