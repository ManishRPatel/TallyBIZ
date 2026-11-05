import { useState, useEffect, type FC } from 'react';
import { X, CheckCircle2, RefreshCw, ArrowRight, Zap } from 'lucide-react';
import { API_BASE } from '../utils/erpHelpers';

interface PaymentReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: { customer_name: string }[];
  suppliers: { supplier_name: string }[];
  onReconciliationDone: () => void;
}

interface InvoiceRow {
  id: number;
  invoice_number: string;
  posting_date: string;
  grand_total: number;
  allocated_amount: number;
  outstanding_amount: number;
}

interface PaymentRow {
  id: number;
  voucher_no: string;
  posting_date: string;
  mode_of_payment: string;
  paid_amount: number;
  allocated_amount: number;
  unallocated_amount: number;
}

interface AllocationItem {
  payment_id: number;
  payment_voucher: string;
  invoice_id: number;
  invoice_type: 'Sales Invoice' | 'Purchase Invoice';
  invoice_number: string;
  allocated_amount: number;
}

export const PaymentReconciliationModal: FC<PaymentReconciliationModalProps> = ({
  isOpen,
  onClose,
  customers,
  suppliers,
  onReconciliationDone,
}) => {
  const [partyType, setPartyType] = useState<'Customer' | 'Supplier'>('Customer');
  const [partyName, setPartyName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);

  useEffect(() => {
    setPartyName('');
    setInvoices([]);
    setPayments([]);
    setAllocations([]);
  }, [partyType]);

  const fetchRecords = async (name: string) => {
    if (!name) {
      setInvoices([]);
      setPayments([]);
      setAllocations([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/accounts/reconciliation/?party_type=${partyType}&party_name=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setInvoices(data.invoices || []);
      setPayments(data.payments || []);
      setAllocations([]);
    } catch (err) {
      console.error(err);
      alert('Could not fetch invoices and payments for reconciliation');
    } finally {
      setLoading(false);
    }
  };

  // Auto Allocate using FIFO (First-In, First-Out)
  const handleAutoAllocate = () => {
    if (invoices.length === 0 || payments.length === 0) {
      alert('Requires at least one unpaid invoice and one unallocated payment.');
      return;
    }

    const newAllocations: AllocationItem[] = [];
    const invType = partyType === 'Customer' ? 'Sales Invoice' : 'Purchase Invoice';

    // Temporary copy to track remaining
    const remainingInvoices = invoices.map(inv => ({ ...inv, remaining: inv.outstanding_amount }));
    const remainingPayments = payments.map(p => ({ ...p, remaining: p.unallocated_amount }));

    for (const inv of remainingInvoices) {
      if (inv.remaining <= 0) continue;

      for (const p of remainingPayments) {
        if (p.remaining <= 0) continue;

        const allocAmt = Math.min(inv.remaining, p.remaining);
        if (allocAmt > 0) {
          newAllocations.push({
            payment_id: p.id,
            payment_voucher: p.voucher_no,
            invoice_id: inv.id,
            invoice_type: invType,
            invoice_number: inv.invoice_number,
            allocated_amount: parseFloat(allocAmt.toFixed(2))
          });

          inv.remaining -= allocAmt;
          p.remaining -= allocAmt;

          if (inv.remaining <= 0.001) break;
        }
      }
    }

    if (newAllocations.length === 0) {
      alert('No matching allocations possible.');
      return;
    }

    setAllocations(newAllocations);
  };

  const handleSaveReconciliation = async () => {
    if (allocations.length === 0) {
      alert('No allocations to reconcile.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/accounts/reconciliation/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reconcile payments');
      }
      alert('Reconciliation successful! Invoices and Payments adjusted.');
      onReconciliationDone();
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const partyList = partyType === 'Customer' ? customers.map(c => c.customer_name) : suppliers.map(s => s.supplier_name);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '960px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>Payment Reconciliation Tool</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Match open payments and advances against outstanding invoices</p>
          </div>
          <button onClick={onClose} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ width: '180px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Party Type</label>
            <select
              value={partyType}
              onChange={e => setPartyType(e.target.value as any)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              <option value="Customer">Customer</option>
              <option value="Supplier">Supplier</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>Select {partyType} *</label>
            <select
              value={partyName}
              onChange={e => {
                setPartyName(e.target.value);
                void fetchRecords(e.target.value);
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              <option value="">-- Choose {partyType} --</option>
              {partyList.map((p, idx) => (
                <option key={idx} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {partyName && (
            <div style={{ paddingTop: '20px' }}>
              <button
                type="button"
                onClick={() => void fetchRecords(partyName)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading records...</div>
        ) : !partyName ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            Select a customer or supplier above to view open invoices and payments.
          </div>
        ) : (
          <div>
            {/* 2 Column View: Invoices vs Payments */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              
              {/* Invoices List */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                  Unpaid Invoices ({invoices.length})
                </h3>
                {invoices.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No unpaid invoices found.</p>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Invoice #</th>
                          <th style={{ padding: '6px 8px' }}>Date</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(inv => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{inv.invoice_number}</td>
                            <td style={{ padding: '6px 8px', color: '#64748b' }}>{inv.posting_date}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{inv.grand_total.toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>₹{inv.outstanding_amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payments List */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                  Unallocated Payments ({payments.length})
                </h3>
                {payments.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>No unallocated payments found.</p>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Voucher #</th>
                          <th style={{ padding: '6px 8px' }}>Date</th>
                          <th style={{ padding: '6px 8px' }}>Mode</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Unallocated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{p.voucher_no}</td>
                            <td style={{ padding: '6px 8px', color: '#64748b' }}>{p.posting_date}</td>
                            <td style={{ padding: '6px 8px' }}>{p.mode_of_payment}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#15803d', fontWeight: 'bold' }}>₹{p.unallocated_amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Auto Allocate Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={handleAutoAllocate}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}
              >
                <Zap size={16} /> Auto-Allocate (FIFO Match)
              </button>
            </div>

            {/* Allocation Result Table */}
            {allocations.length > 0 && (
              <div style={{ border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} /> Ready for Reconciliation ({allocations.length} Match)
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff', borderRadius: '6px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#dbeafe', color: '#1e3a8a', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Payment Voucher</th>
                      <th style={{ padding: '8px 12px' }}></th>
                      <th style={{ padding: '8px 12px' }}>Target Invoice</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount To Adjust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '600' }}>{a.payment_voucher}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}><ArrowRight size={14} /></td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0369a1' }}>{a.invoice_number}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>
                          ₹{a.allocated_amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <td colSpan={3} style={{ padding: '8px 12px', textAlign: 'right' }}>Total Reconciled Amount:</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0284c7', fontSize: '15px' }}>
                        ₹{totalAllocated.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReconciliation}
                disabled={allocations.length === 0 || submitting}
                style={{
                  padding: '8px 22px',
                  borderRadius: '6px',
                  border: 'none',
                  background: allocations.length > 0 ? '#15803d' : '#94a3b8',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: allocations.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {submitting ? 'Reconciling...' : 'Confirm & Reconcile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};