import type { FC } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { DataTable } from '../DataTable';
import type { Customer } from '../../types/erp';

interface CustomersTabProps {
  customers: Customer[];
  partyOutstanding: {
    customers: Record<string, number>;
    total_receivable: number;
  };
  setEditingId: (id: number | null) => void;
  setCustomerForm: (form: Customer) => void;
  setShowCustomerModal: (show: boolean) => void;
}

export const CustomersTab: FC<CustomersTabProps> = ({
  customers,
  partyOutstanding,
  setEditingId,
  setCustomerForm,
  setShowCustomerModal,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Customers</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Customer registry & party master</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setCustomerForm({
              customer_name: '',
              customer_type: 'Company',
              gst_category: 'Unregistered',
              gstin: '',
              email: '',
              mobile_no: '',
              city: '',
              postal_code: ''
            });
            setShowCustomerModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          <Plus size={16} /> New Customer
        </button>
      </div>

      {/* Total Receivables Summary Card */}
      <div style={{ maxWidth: '340px', background: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Receivables (Debtors)</span>
        <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', color: '#0369a1' }}>
          Rs. {partyOutstanding.total_receivable.toFixed(2)}
        </h3>
      </div>

      <DataTable<Customer>
        columns={[
          { header: 'Customer Name', accessor: 'customer_name' },
          { header: 'Type', accessor: 'customer_type' },
          { header: 'GSTIN', accessor: r => r.gstin || '-' },
          { header: 'City', accessor: r => r.city || '-' },
          {
            header: 'Outstanding Balance',
            accessor: (row) => {
              const bal = partyOutstanding.customers[row.customer_name] || 0;
              return (
                <strong style={{ color: bal > 0 ? '#b91c1c' : '#15803d' }}>
                  Rs. {bal.toFixed(2)} {bal > 0 ? 'Dr' : ''}
                </strong>
              );
            }
          },
          {
            header: 'Action',
            accessor: (row) => (
              <button
                onClick={() => {
                  setEditingId(row.id || null);
                  setCustomerForm({ ...row });
                  setShowCustomerModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1' }}
              >
                <Edit2 size={12} /> Edit
              </button>
            )
          }
        ]}
        data={customers}
        emptyMessage="No customers yet."
      />
    </div>
  );
};