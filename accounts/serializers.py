from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
from .models import PaymentEntry, JournalEntry, JournalEntryLine
from .services import make_gl_entries


class PaymentEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentEntry
        fields = '__all__'

    def validate_paid_amount(self, value):
        # Defect #5 Fix: શૂન્ય કે નેગેટિવ રકમ સ્વીકારવી નહીં
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Paid amount must be strictly greater than zero.")
        return value

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
            # 1. Creditors Debit (- દેવું ઘટ્યું)
            # 2. Bank/Cash Credit (- પૈસા ઘટ્યા)
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

    @transaction.atomic
    def update(self, instance, validated_data):
        from .models import GLEntry
        
        # 1. Juna payment ni existing GL Entries delete karo
        GLEntry.objects.filter(
            voucher_type="Payment Entry", 
            voucher_no=instance.voucher_no
        ).delete()

        # 2. Payment instance na fields update karo
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 3. Nava mode ane nava amount mujab Bank/Cash nakki karo
        bank_or_cash = "Bank Account" if instance.mode_of_payment in ['Bank', 'Cheque'] else "Cash Account"

        # 4. Navi GL Entries re-post karo
        if instance.payment_type == 'Receive':
            gl_map = [
                {
                    "posting_date": instance.posting_date,
                    "account": bank_or_cash,
                    "party_type": None,
                    "party": None,
                    "voucher_type": "Payment Entry",
                    "voucher_no": instance.voucher_no,
                    "against": instance.party_name,
                    "debit": instance.paid_amount,
                    "credit": Decimal('0.00'),
                    "remarks": f"Received via {instance.mode_of_payment} (Ref: {instance.reference_no or '-'})"
                },
                {
                    "posting_date": instance.posting_date,
                    "account": "Debtors",
                    "party_type": "Customer",
                    "party": instance.party_name,
                    "voucher_type": "Payment Entry",
                    "voucher_no": instance.voucher_no,
                    "against": bank_or_cash,
                    "debit": Decimal('0.00'),
                    "credit": instance.paid_amount,
                    "remarks": f"Payment from {instance.party_name}"
                }
            ]
        else:
            gl_map = [
                {
                    "posting_date": instance.posting_date,
                    "account": "Creditors",
                    "party_type": "Supplier",
                    "party": instance.party_name,
                    "voucher_type": "Payment Entry",
                    "voucher_no": instance.voucher_no,
                    "against": bank_or_cash,
                    "debit": instance.paid_amount,
                    "credit": Decimal('0.00'),
                    "remarks": f"Payment to {instance.party_name}"
                },
                {
                    "posting_date": instance.posting_date,
                    "account": bank_or_cash,
                    "party_type": None,
                    "party": None,
                    "voucher_type": "Payment Entry",
                    "voucher_no": instance.voucher_no,
                    "against": instance.party_name,
                    "debit": Decimal('0.00'),
                    "credit": instance.paid_amount,
                    "remarks": f"Paid via {instance.mode_of_payment}"
                }
            ]

        make_gl_entries(gl_map)
        return instance

class JournalEntryLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntryLine
        fields = ['id', 'account', 'party_type', 'party_name', 'debit', 'credit']

class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = ['id', 'voucher_no', 'posting_date', 'voucher_type', 'narration', 'total_amount', 'lines', 'created_at']   