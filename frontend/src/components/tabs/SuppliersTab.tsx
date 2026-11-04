import type { FC } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { DataTable } from '../DataTable';
import type { Supplier } from '../../types/erp';

interface SuppliersTabProps {
  suppliers: Supplier[];
  partyOutstanding: {
    suppliers: Record<string, number>;
    total_payable: number;
  };
  setEditingId: (id: number | null) => void;
  setSupplierForm: (form: Supplier) => void;
  setShowSupplierModal: (show: boolean) => void;
}

export const SuppliersTab: FC<SuppliersTabProps> = ({
  suppliers,
  partyOutstanding,
  setEditingId,
  setSupplierForm,
  setShowSupplierModal,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Suppliers (Vendors)</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Supplier registry with GSTIN & accounts tracking</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setSupplierForm({
              supplier_name: '',
              supplier_type: 'Company',
              gst_category: 'Registered Regular',
              gstin: '',
              email: '',
              mobile_no: '',
              city: '',
              postal_code: ''
            });
            setShowSupplierModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          <Plus size={16} /> New Supplier
        </button>
      </div>

      {/* Total Payables Summary Card */}
      <div style={{ maxWidth: '340px', background: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Payables (Creditors)</span>
        <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', color: '#dc2626' }}>
          Rs. {partyOutstanding.total_payable.toFixed(2)}
        </h3>
      </div>

      <DataTable<Supplier>
        columns={[
          { header: 'Supplier Name', accessor: 'supplier_name' },
          { header: 'GSTIN', accessor: r => r.gstin || '-' },
          { header: 'GST Category', accessor: 'gst_category' },
          { header: 'City', accessor: r => r.city || '-' },
          {
            header: 'Outstanding Payable',
            accessor: (row) => {
              const bal = partyOutstanding.suppliers[row.supplier_name] || 0;
              return (
                <strong style={{ color: bal > 0 ? '#dc2626' : '#15803d' }}>
                  Rs. {bal.toFixed(2)} {bal > 0 ? 'Cr' : ''}
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
                  setSupplierForm({ ...row });
                  setShowSupplierModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1' }}
              >
                <Edit2 size={12} /> Edit
              </button>
            )
          }
        ]}
        data={suppliers}
        emptyMessage="No suppliers registered yet."
      />
    </div>
  );
};