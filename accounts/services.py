from decimal import Decimal
from django.db import transaction
from .models import GLEntry

@transaction.atomic
def make_gl_entries(gl_map: list):
    """
    gl_map list of dicts:
    [
        {
            "posting_date": "2026-11-02",
            "account": "Debtors",
            "party_type": "Customer",
            "party": "Amit Shah",
            "voucher_type": "Sales Invoice",
            "voucher_no": "INV-2026-001",
            "against": "Sales Income",
            "debit": Decimal('1180.00'),
            "credit": Decimal('0.00'),
            "remarks": "Invoice generated"
        },
        ...
    ]
    """
    total_debit = Decimal('0.00')
    total_credit = Decimal('0.00')

    entries_to_create = []
    for row in gl_map:
        debit = Decimal(str(row.get('debit', 0)))
        credit = Decimal(str(row.get('credit', 0)))

        # 0 વાળી એન્ટ્રી ઇગ્નોર કરવી
        if debit == Decimal('0.00') and credit == Decimal('0.00'):
            continue

        total_debit += debit
        total_credit += credit

        entries_to_create.append(
            GLEntry(
                posting_date=row['posting_date'],
                account=row['account'],
                party_type=row.get('party_type'),
                party=row.get('party'),
                voucher_type=row['voucher_type'],
                voucher_no=row['voucher_no'],
                against=row.get('against', ''),
                debit=debit,
                credit=credit,
                remarks=row.get('remarks', '')
            )
        )

    # ડબલ એન્ટ્રી બુકકીપિંગ નિયમ: Debit અને Credit સરખા હોવા જ જોઈએ
    if round(total_debit, 2) != round(total_credit, 2):
        raise ValueError(f"Debit ({total_debit}) and Credit ({total_credit}) must be equal!")

    return GLEntry.objects.bulk_create(entries_to_create)