import type { FC } from 'react';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { DataTable } from '../DataTable';
import type { PaymentEntry } from '../../types/erp';
import { getNextPaymentNumber } from '../../utils/erpHelpers';

interface PaymentsTabProps {
  payments: PaymentEntry[];
  setPaymentForm: any;
  setShowPaymentModal: (show: boolean) => void;
  setSelectedPaymentForPrint: (payment: PaymentEntry | null) => void;
  handleDeletePayment: (id: number, voucherNo: string) => void;
}

export const PaymentsTab: FC<PaymentsTabProps> = ({
  payments,
  setPaymentForm,
  setShowPaymentModal,
  setSelectedPaymentForPrint,
  handleDeletePayment,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Payment Entries</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Customer receipts & supplier vendor payments</p>
        </div>
        <button
          onClick={() => {
            setPaymentForm((prev: any) => ({
              ...prev,
              voucher_no: getNextPaymentNumber(payments),
              payment_type: 'Receive',
              party_type: 'Customer',
              party_name: '',
              paid_amount: '0',
              reference_no: '',
              remarks: ''
            }));
            setShowPaymentModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          <Plus size={16} /> Make / Receive Payment
        </button>
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