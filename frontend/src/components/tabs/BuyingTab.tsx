import type { FC } from 'react';
import { Plus, Download, Search, Printer, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '../DataTable';
import type { PurchaseInvoice } from '../../types/erp';
import {
  getDueStatus,
  getNextPurchaseNumber,
  inferTaxRate,
  newLine,
  lineFromItem,
  exportToCSV,
} from '../../utils/erpHelpers';

interface BuyingTabProps {
  purchases: PurchaseInvoice[];
  filteredPurchases: PurchaseInvoice[];
  purchaseStatusMap: Record<number, { status: 'Paid' | 'Partially Paid' | 'Unpaid'; paid: number; balance: number }>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setEditingId: (id: number | null) => void;
  setPurchaseForm: any;
  setShowPurchaseModal: (show: boolean) => void;
  setSelectedPurchaseForPrint: (bill: PurchaseInvoice | null) => void;
  handleDeletePurchase: (id: number, billNo: string) => void;
}

export const BuyingTab: FC<BuyingTabProps> = ({
  purchases,
  filteredPurchases,
  purchaseStatusMap,
  searchQuery,
  setSearchQuery,
  setEditingId,
  setPurchaseForm,
  setShowPurchaseModal,
  setSelectedPurchaseForPrint,
  handleDeletePurchase,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Purchase Bills (Buying)</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Inward supplier bills, input GST credits & inventory replenishment</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              const exportData = purchases.map(pur => ({
                'Bill No': pur.bill_number,
                'Supplier': pur.supplier_name,
                'Date': pur.posting_date,
                'Net Total (Rs)': pur.net_total,
                'Input Tax (Rs)': pur.tax_amount,
                'Total Payable (Rs)': pur.grand_total,
                'Status': pur.status || 'Submitted'
              }));
              exportToCSV(exportData, 'Purchase_Bills');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            <Download size={16} /> Export Excel
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setPurchaseForm((prev: any) => ({
                ...prev,
                bill_number: getNextPurchaseNumber(purchases),
                supplier_id: '',
                tax_rate: '18',
                status: 'Submitted',
                lines: [newLine()]
              }));
              setShowPurchaseModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            <Plus size={16} /> New Purchase Bill
          </button>
        </div>
      </div>

      {/* Supplier Overdue Payment Reminder Banner */}
      {(() => {
        const overdueBills = purchases.filter(pur => {
          const statusInfo = purchaseStatusMap[pur.id || 0];
          if (statusInfo?.status === 'Paid') return false;
          const dueInfo = getDueStatus(pur.posting_date, (pur as any).due_date);
          return dueInfo.isOverdue;
        });

        const totalOverduePayable = overdueBills.reduce((sum, pur) => {
          const balance = purchaseStatusMap[pur.id || 0]?.balance ?? parseFloat(String(pur.grand_total));
          return sum + balance;
        }, 0);

        if (overdueBills.length === 0) return null;

        return (
          <div style={{
            background: '#fff5f5',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '22px' }}>⚠️</span>
              <div>
                <strong style={{ color: '#991b1b', fontSize: '14px' }}>
                  Supplier Payment Reminder: {overdueBills.length} {overdueBills.length === 1 ? 'Bill is' : 'Bills are'} Overdue!
                </strong>
                <p style={{ margin: '2px 0 0 0', color: '#7f1d1d', fontSize: '12px' }}>
                  Total overdue payables: <strong>Rs. {totalOverduePayable.toFixed(2)}</strong> (Suppliers: {overdueBills.map(p => p.supplier_name).filter((v, idx, a) => a.indexOf(v) === idx).join(', ')}).
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Live Search Input Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search bill # or supplier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
            Clear Search
          </button>
        )}
      </div>

      <DataTable<PurchaseInvoice>
        columns={[
          { header: 'Bill #', accessor: 'bill_number' },
          { header: 'Supplier', accessor: 'supplier_name' },
          { header: 'Posting Date', accessor: 'posting_date' },
          {
            header: 'Due Date',
            accessor: (row) => {
              const dueInfo = getDueStatus(row.posting_date, (row as any).due_date);
              const paymentInfo = purchaseStatusMap[row.id || 0];
              const isPaid = paymentInfo?.status === 'Paid';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '500' }}>{dueInfo.dueDate}</span>
                  {!isPaid && (
                    dueInfo.isOverdue ? (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', width: 'fit-content' }}>
                        ⚠️ {dueInfo.text}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {dueInfo.text}
                      </span>
                    )
                  )}
                </div>
              );
            }
          },
          { header: 'Net (Rs.)', accessor: r => `Rs. ${r.net_total}` },
          { header: 'Input Tax (Rs.)', accessor: r => `Rs. ${r.tax_amount}` },
          { header: 'Total Payable (Rs.)', accessor: r => <strong>Rs. {r.grand_total}</strong> },
          {
            header: 'Payment Status',
            accessor: (row) => {
              const info = purchaseStatusMap[row.id || 0];
              if (!info || info.status === 'Unpaid') {
                return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Unpaid</span>;
              }
              if (info.status === 'Paid') {
                return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Paid</span>;
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', width: 'fit-content' }}>
                    Partially Paid
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Bal: Rs. {info.balance.toFixed(2)}</span>
                </div>
              );
            }
          },
          {
            header: 'Actions',
            accessor: (row) => (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setSelectedPurchaseForPrint(row)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '500' }}
                >
                  <Printer size={12} /> Print
                </button>
                <button
                  onClick={() => {
                    setEditingId(row.id || null);
                    setPurchaseForm({
                      bill_number: row.bill_number,
                      supplier_id: row.supplier ? row.supplier.toString() : '',
                      posting_date: row.posting_date,
                      due_date: (row as any).due_date || row.posting_date,
                      tax_rate: inferTaxRate(row.net_total, row.tax_amount),
                      status: row.status || 'Submitted',
                      lines: row.items?.length ? row.items.map(lineFromItem) : [newLine()]
                    });
                    setShowPurchaseModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1' }}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => { if (row.id !== undefined) void handleDeletePurchase(row.id, row.bill_number); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#b91c1c' }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )
          }
        ]}
        data={filteredPurchases}
        emptyMessage="No purchase bills recorded yet."
      />
    </div>
  );
};