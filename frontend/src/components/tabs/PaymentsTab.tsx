import type { FC } from 'react';
import { Printer, Trash2, Edit } from 'lucide-react';
import { DataTable } from '../DataTable';
import type { PaymentEntry } from '../../types/erp';

interface PaymentsTabProps {
  payments: PaymentEntry[];
  setPaymentForm: React.Dispatch<React.SetStateAction<any>>;
  setShowPaymentModal: (show: boolean) => void;
  setSelectedPaymentForPrint: (payment: PaymentEntry) => void;
  handleDeletePayment: (id: number, voucherNo: string) => void;
  onOpenReconciliation: () => void;
  setEditingId: (id: number | null) => void;
}

export const PaymentsTab: FC<PaymentsTabProps> = ({
  payments,
  setPaymentForm,
  setShowPaymentModal,
  setSelectedPaymentForPrint,
  handleDeletePayment,
  onOpenReconciliation,
  setEditingId,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Payment Entries</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Customer receipts & supplier vendor payments</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onOpenReconciliation}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            ⚡ Reconcile Payments
          </button>
          <button
            onClick={() => {
              setPaymentForm({
                voucher_no: `PAY-${Date.now().toString().slice(-4)}`,
                payment_type: 'Receive',
                posting_date: new Date().toISOString().split('T')[0],
                party_type: 'Customer',
                party_name: '',
                mode_of_payment: 'Bank',
                paid_amount: '0',
                reference_no: '',
                remarks: ''
              });
              setShowPaymentModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            + Make / Receive Payment
          </button>
        </div>
      </div>

      <DataTable<PaymentEntry>
        columns={[
          { header: 'Voucher #', accessor: 'voucher_no' },
          { header: 'Date', accessor: 'posting_date' },
          { header: 'Type', accessor: 'payment_type' },
          { header: 'Party', accessor: 'party_name' },
          { header: 'Mode', accessor: 'mode_of_payment' },
          { header: 'Amount (Rs.)', accessor: r => <strong style={{ color: r.payment_type === 'Receive' ? '#15803d' : '#b91c1c' }}>Rs. {r.paid_amount}</strong> },
          {
            header: 'Action',
            accessor: (row) => (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setSelectedPaymentForPrint(row)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '500' }}
                >
                  <Printer size={12} /> Print
                </button>
                <button
                  onClick={() => {
                    if (row.id !== undefined) {
                      setEditingId(row.id);
                      setPaymentForm(row);
                      setShowPaymentModal(true);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', border: '1px solid #f59e0b', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#92400e' }}
                >
                  <Edit size={12} /> Edit
                </button>
                <button
                  onClick={() => { if (row.id !== undefined) void handleDeletePayment(row.id, row.voucher_no); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#b91c1c' }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )
          }
        ]}
        data={payments}
        emptyMessage="No payment entries yet."
      />
    </div>
  );
};