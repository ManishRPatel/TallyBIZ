import type { FC } from 'react';
import { Plus, Download, Search, Printer, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '../DataTable';
import { MonthlyAnalyticsChart } from '../MonthlyAnalyticsChart';
import type { SalesInvoice } from '../../types/erp';
import {
  getDueStatus,
  getNextInvoiceNumber,
  inferTaxRate,
  newLine,
  lineFromItem,
  exportToCSV,
  type DashboardSummary,
} from '../../utils/erpHelpers';

interface SellingTabProps {
  invoices: SalesInvoice[];
  filteredInvoices: SalesInvoice[];
  salesStatusMap: Record<number, { status: 'Paid' | 'Partially Paid' | 'Unpaid'; paid: number; balance: number }>;
  dashboardSummary: DashboardSummary;
  gstData: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setEditingId: (id: number | null) => void;
  setInvoiceForm: any;
  setShowInvoiceModal: (show: boolean) => void;
  setSelectedInvoiceForPrint: (inv: SalesInvoice | null) => void;
  handleDeleteInvoice: (id: number, invNo: string) => void;
}

export const SellingTab: FC<SellingTabProps> = ({
  invoices,
  filteredInvoices,
  salesStatusMap,
  dashboardSummary,
  gstData,
  searchQuery,
  setSearchQuery,
  setEditingId,
  setInvoiceForm,
  setShowInvoiceModal,
  setSelectedInvoiceForPrint,
  handleDeleteInvoice,
}) => {
  return (
    <div>
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Sales Invoices</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Customer sales with GST & automatic inventory deductions</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              const exportData = invoices.map(inv => ({
                'Invoice No': inv.invoice_number,
                'Customer': inv.customer_name,
                'Date': inv.posting_date,
                'Net Total (Rs)': inv.net_total,
                'Tax (Rs)': inv.tax_amount,
                'Grand Total (Rs)': inv.grand_total,
                'Payment Status': salesStatusMap[inv.id || 0]?.status || 'Unpaid',
                'Balance Due (Rs)': (salesStatusMap[inv.id || 0]?.balance ?? parseFloat(String(inv.grand_total))).toFixed(2)
              }));
              exportToCSV(exportData, 'Sales_Invoices');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            <Download size={16} /> Export Excel
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setInvoiceForm((prev: any) => ({
                ...prev,
                invoice_number: getNextInvoiceNumber(invoices),
                customer_id: '',
                tax_rate: '18',
                status: 'Submitted',
                lines: [newLine()]
              }));
              setShowInvoiceModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total Sales</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '22px', color: '#0284c7' }}>Rs. {dashboardSummary.total_sales.toFixed(2)}</h3>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total Purchases</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '22px', color: '#dc2626' }}>Rs. {dashboardSummary.total_purchases.toFixed(2)}</h3>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Bank Balance</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '22px', color: '#15803d' }}>Rs. {dashboardSummary.bank_balance.toFixed(2)}</h3>
        </div>
      </div>

      {/* Payment Overdue Reminder Banner */}
      {(() => {
        const overdueInvoices = invoices.filter(inv => {
          const statusInfo = salesStatusMap[inv.id || 0];
          if (statusInfo?.status === 'Paid') return false;
          const dueInfo = getDueStatus(inv.posting_date, (inv as any).due_date);
          return dueInfo.isOverdue;
        });

        const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => {
          const balance = salesStatusMap[inv.id || 0]?.balance ?? parseFloat(String(inv.grand_total));
          return sum + balance;
        }, 0);

        if (overdueInvoices.length === 0) return null;

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
                  Payment Reminder: {overdueInvoices.length} {overdueInvoices.length === 1 ? 'Invoice is' : 'Invoices are'} Overdue!
                </strong>
                <p style={{ margin: '2px 0 0 0', color: '#7f1d1d', fontSize: '12px' }}>
                  Total overdue receivables: <strong>Rs. {totalOverdueAmount.toFixed(2)}</strong> (Parties: {overdueInvoices.map(i => i.customer_name).filter((v, idx, a) => a.indexOf(v) === idx).join(', ')}).
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Analytics Chart */}
      <MonthlyAnalyticsChart data={gstData} />

      {/* Live Search Input Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search invoice # or customer..."
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

      {/* Invoices Data Table */}
      <DataTable<SalesInvoice>
        columns={[
          { header: 'Invoice #', accessor: 'invoice_number' },
          { header: 'Customer', accessor: 'customer_name' },
          { header: 'Posting Date', accessor: 'posting_date' },
          {
            header: 'Due Date',
            accessor: (row) => {
              const dueInfo = getDueStatus(row.posting_date, (row as any).due_date);
              const paymentInfo = salesStatusMap[row.id || 0];
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
          { header: 'Tax (Rs.)', accessor: r => `Rs. ${r.tax_amount}` },
          { header: 'Grand Total (Rs.)', accessor: r => <strong>Rs. {r.grand_total}</strong> },
          {
            header: 'Payment Status',
            accessor: (row) => {
              const info = salesStatusMap[row.id || 0];
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
                  onClick={() => setSelectedInvoiceForPrint(row)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '500' }}
                >
                  <Printer size={12} /> Print
                </button>
                <button
                  onClick={() => {
                    setEditingId(row.id || null);
                    setInvoiceForm({
                      invoice_number: row.invoice_number,
                      customer_id: row.customer ? row.customer.toString() : '',
                      posting_date: row.posting_date,
                      due_date: (row as any).due_date || row.posting_date,
                      tax_rate: inferTaxRate(row.net_total, row.tax_amount),
                      status: row.status || 'Submitted',
                      lines: row.items?.length ? row.items.map(lineFromItem) : [newLine()]
                    });
                    setShowInvoiceModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#475569' }}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => { if (row.id !== undefined) void handleDeleteInvoice(row.id, row.invoice_number); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#b91c1c' }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )
          }
        ]}
        data={filteredInvoices}
        emptyMessage="No sales invoices created yet."
      />
    </div>
  );
}; 