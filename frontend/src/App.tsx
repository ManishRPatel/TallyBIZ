import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { DataTable } from './components/DataTable';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import type { Customer, Supplier, Item, GLEntryRow, SalesInvoice, PurchaseInvoice, PaymentEntry, StockLedgerRow, FinancialStatements } from './types/erp';
import { ShoppingCart, ShoppingBag, Users, Truck, Package, BookOpen, CreditCard, PieChart, Plus, X, Edit2, Printer, Filter, RefreshCw, Trash2, Layers } from 'lucide-react';
import { PurchaseBillPrintModal } from './components/PurchaseBillPrintModal';
import { PaymentPrintModal } from './components/PaymentPrintModal';
import { LedgerPrintModal } from './components/LedgerPrintModal';
import { FinancialReportPrintModal } from './components/FinancialReportPrintModal';

const API_BASE = 'http://127.0.0.1:8000/api';

const GST_SLABS = ['0', '5', '12', '18', '28'];

// Document numbers must continue from the highest existing sequence, not from
// the row count. Deleting a document leaves a gap, and `length + 1` would then
// hand out a number that already exists (both are UNIQUE in the database).
const nextSequenceNumber = (prefix: string, existing: (string | undefined)[]): string => {
  const highest = existing.reduce((max, value) => {
    const match = /^([A-Za-z-]*)(\d+)$/.exec(value ?? '');
    return match ? Math.max(max, parseInt(match[2], 10)) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
};

const getNextInvoiceNumber = (list: SalesInvoice[]) => nextSequenceNumber('INV-', list.map(i => i.invoice_number));
const getNextPurchaseNumber = (list: PurchaseInvoice[]) => nextSequenceNumber('PUR-', list.map(p => p.bill_number));
const getNextPaymentNumber = (list: PaymentEntry[]) => nextSequenceNumber('PAY-', list.map(p => p.voucher_no));

// The tax rate is not stored on the invoice, but it is recoverable from the
// stored amounts. Snap it to the nearest slab so it matches a <select> option.
const inferTaxRate = (netTotal: number | string, taxAmount: number | string): string => {
  const net = parseFloat(String(netTotal)) || 0;
  const tax = parseFloat(String(taxAmount)) || 0;
  if (net <= 0) return '0';
  const rate = (tax / net) * 100;
  return GST_SLABS.reduce((best, slab) =>
    Math.abs(Number(slab) - rate) < Math.abs(Number(best) - rate) ? slab : best
  );
};

interface LineForm {
  uid: string;
  item_id: string;
  quantity: string;
  rate: string;
}

let lineCounter = 0;

const newLine = (): LineForm => ({ uid: `l${++lineCounter}`, item_id: '', quantity: '1', rate: '0' });

const lineFromItem = (item: { item: number; quantity: number | string; rate: number | string }): LineForm => ({
  uid: `l${++lineCounter}`,
  item_id: String(item.item),
  quantity: String(item.quantity),
  rate: String(item.rate)
});

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box'
};

// Defined at module scope on purpose: a component declared inside App() would
// be a new type on every render, remounting the inputs and dropping focus.
const LineItemsEditor: React.FC<{
  lines: LineForm[];
  items: Item[];
  showStock: boolean;
  onChange: (lines: LineForm[]) => void;
}> = ({ lines, items, showStock, onChange }) => {
  const update = (idx: number, patch: Partial<LineForm>) =>
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lines.map((line, idx) => (
        <div
          key={line.uid}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto', gap: '8px', alignItems: 'end' }}
        >
          <div style={{ minWidth: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: '600' }}>Item *</label>
            <select
              required
              style={fieldStyle}
              value={line.item_id}
              onChange={e => {
                const sel = items.find(i => i.id === parseInt(e.target.value));
                update(idx, { item_id: e.target.value, rate: sel ? String(sel.standard_rate) : line.rate });
              }}
            >
              <option value="">-- Choose Item --</option>
              {items.map(it => (
                <option key={it.id} value={it.id}>
                  {it.item_name}{showStock ? ` - Stock: ${it.current_stock}` : ` (${it.item_code})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600' }}>Qty *</label>
            <input type="number" min="0.01" step="0.01" required style={fieldStyle} value={line.quantity} onChange={e => update(idx, { quantity: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600' }}>Rate *</label>
            <input type="number" min="0" step="0.01" required style={fieldStyle} value={line.rate} onChange={e => update(idx, { rate: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600' }}>Amount</label>
            <div style={{ padding: '8px 0', fontWeight: '600', whiteSpace: 'nowrap' }}>
              Rs. {((parseFloat(line.quantity) || 0) * (parseFloat(line.rate) || 0)).toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(lines.filter((_, i) => i !== idx))}
            disabled={lines.length === 1}
            title="Remove line"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px',
              borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c',
              cursor: lines.length === 1 ? 'not-allowed' : 'pointer', opacity: lines.length === 1 ? 0.5 : 1
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...lines, newLine()])}
        style={{
          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
          borderRadius: '6px', border: '1px dashed #94a3b8', background: '#f8fafc', color: '#475569',
          fontWeight: '600', cursor: 'pointer'
        }}
      >
        <Plus size={14} /> Add Line
      </button>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'selling' | 'buying' | 'customers' | 'suppliers' | 'payments' | 'stock' | 'stock-ledger' | 'accounts' | 'reports'>('selling');
  
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [glEntries, setGlEntries] = useState<GLEntryRow[]>([]);
  const [stockLedger, setStockLedger] = useState<StockLedgerRow[]>([]);
  const [finance, setFinance] = useState<FinancialStatements | null>(null);
  const [showFinancePrintModal, setShowFinancePrintModal] = useState<boolean>(false);

  // Request status
  // `loading` is the transition's pending flag: React keeps it true for the
  // whole async data load, so the spinner tracks the request without any
  // effect-body setState.
  const [loading, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  // Filters
  const [glAccountFilter, setGlAccountFilter] = useState<string>('all');
  const [glPartyFilter, setGlPartyFilter] = useState<string>('all');
  const [stockItemFilter, setStockItemFilter] = useState<string>('all');

  // Print Modal
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<SalesInvoice | null>(null);
  const [selectedPurchaseForPrint, setSelectedPurchaseForPrint] = useState<PurchaseInvoice | null>(null);
  const [selectedPaymentForPrint, setSelectedPaymentForPrint] = useState<PaymentEntry | null>(null);
  const [showLedgerPrintModal, setShowLedgerPrintModal] = useState<boolean>(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Forms
  const [customerForm, setCustomerForm] = useState<Customer>({
    customer_name: '', customer_type: 'Company', gst_category: 'Unregistered', gstin: '', email: '', mobile_no: '', city: '', postal_code: ''
  });

  const [supplierForm, setSupplierForm] = useState<Supplier>({
    supplier_name: '', supplier_type: 'Company', gst_category: 'Registered Regular', gstin: '', email: '', mobile_no: '', city: '', postal_code: ''
  });

  const [itemForm, setItemForm] = useState({
    item_code: '', item_name: '', category: 'General', unit: 'Nos', standard_rate: '0', current_stock: '0'
  });

  const [invoiceForm, setInvoiceForm] = useState(() => ({
    invoice_number: 'INV-0001', customer_id: '', posting_date: new Date().toISOString().split('T')[0],
    tax_rate: '18', status: 'Submitted', lines: [newLine()]
  }));

  const [purchaseForm, setPurchaseForm] = useState(() => ({
    bill_number: 'PUR-0001', supplier_id: '', posting_date: new Date().toISOString().split('T')[0],
    tax_rate: '18', status: 'Submitted', lines: [newLine()]
  }));

  const [paymentForm, setPaymentForm] = useState({
    voucher_no: 'PAY-0001', payment_type: 'Receive' as 'Receive' | 'Pay', posting_date: new Date().toISOString().split('T')[0], party_type: 'Customer', party_name: '', mode_of_payment: 'Bank' as 'Bank' | 'Cash' | 'Cheque', paid_amount: '0', reference_no: '', remarks: ''
  });

  // `loadData` reads the current filter values, so it is a `useCallback` over
  // those filters. The fetch itself runs inside a transition: React keeps
  // `loading` true for the whole async transition, which gives us the spinner
  // without setting state synchronously in the effect body.
  const loadData = useCallback(() => {
    const seq = ++requestSeq.current;
    startTransition(async () => {
      try {
        const glParams = new URLSearchParams();
        if (glAccountFilter !== 'all') glParams.append('account', glAccountFilter);
        if (glPartyFilter !== 'all') glParams.append('party', glPartyFilter);

        const stockParams = new URLSearchParams();
        if (stockItemFilter !== 'all') stockParams.append('item_id', stockItemFilter);

        const [resCust, resSupp, resItems, resInvoices, resPurch, resPay, resGL, resStock, resFin] = await Promise.all([
          fetch(`${API_BASE}/selling/customers/`),
          fetch(`${API_BASE}/buying/suppliers/`),
          fetch(`${API_BASE}/stock/items/`),
          fetch(`${API_BASE}/selling/invoices/`),
          fetch(`${API_BASE}/buying/invoices/`),
          fetch(`${API_BASE}/accounts/payments/`),
          fetch(`${API_BASE}/accounts/general-ledger/?${glParams.toString()}`),
          fetch(`${API_BASE}/stock/stock-ledger/?${stockParams.toString()}`),
          fetch(`${API_BASE}/accounts/financial-statements/`)
        ]);

        // A newer request has started in the meantime - drop this response so a
        // slow reply cannot overwrite fresher data.
        if (seq !== requestSeq.current) return;

        const failed: string[] = [];
        const read = async (label: string, res: Response) => {
          if (!res.ok) { failed.push(label); return null; }
          try { return await res.json(); }
          catch { failed.push(label); return null; }
        };

        const [cust, supp, itemList, inv, pur, pay, gl, stock, fin] = await Promise.all([
          read('Customers', resCust),
          read('Suppliers', resSupp),
          read('Items', resItems),
          read('Sales invoices', resInvoices),
          read('Purchase bills', resPurch),
          read('Payments', resPay),
          read('General ledger', resGL),
          read('Stock ledger', resStock),
          read('Financial statements', resFin),
        ]);

        setLoadError(null);
        if (cust) setCustomers(cust);
        if (supp) setSuppliers(supp);
        if (itemList) setItems(itemList);
        if (inv) setInvoices(inv);
        if (pur) setPurchases(pur);
        if (pay) setPayments(pay);
        if (gl) setGlEntries(gl);
        if (stock) setStockLedger(stock);
        if (fin) setFinance(fin);

        if (failed.length > 0) setLoadError(`Could not load: ${failed.join(', ')}.`);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        console.error("API error:", err);
        setLoadError('Could not reach the server. Is the Django backend running on http://127.0.0.1:8000?');
      }
    });
  }, [glAccountFilter, glPartyFilter, stockItemFilter]);

  // `loadData` already pulls every dataset, so switching tabs has nothing new
  // to fetch - it only re-runs when one of the ledger filters changes.
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Safe Deletion Handlers
  const handleDeleteInvoice = async (id: number, invNo: string) => {
    if (!window.confirm(`Are you sure you want to delete Sales Invoice #${invNo}? This will automatically reverse stock deduction and General Ledger entries.`)) return;
    try {
      const res = await fetch(`${API_BASE}/selling/invoices/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete invoice');
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  const handleDeletePurchase = async (id: number, billNo: string) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Bill #${billNo}? This will automatically deduct added stock and reverse GL liabilities.`)) return;
    try {
      const res = await fetch(`${API_BASE}/buying/invoices/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete purchase bill');
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  const handleSaveCustomer = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/selling/customers/${editingId}/` : `${API_BASE}/selling/customers/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customerForm)
      });
      if (!res.ok) throw new Error('Failed to save customer');
      setShowCustomerModal(false);
      setEditingId(null);
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  const handleSaveSupplier = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/buying/suppliers/${editingId}/` : `${API_BASE}/buying/suppliers/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supplierForm)
      });
      if (!res.ok) throw new Error('Failed to save supplier');
      setShowSupplierModal(false);
      setEditingId(null);
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  const handleSaveItem = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/stock/items/${editingId}/` : `${API_BASE}/stock/items/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        // current_stock is derived from the Stock Ledger - the backend
        // recomputes it from the ledger on every read - so it is never sent
        // from the client.
        body: JSON.stringify({
          item_code: itemForm.item_code,
          item_name: itemForm.item_name,
          category: itemForm.category,
          unit: itemForm.unit,
          standard_rate: parseFloat(itemForm.standard_rate) || 0
        })
      });
      if (!res.ok) throw new Error('Failed to save item');
      setShowItemModal(false);
      setEditingId(null);
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  // Line-item helpers shared by the sales and purchase forms.
  const buildLines = (lines: LineForm[]) =>
    lines.map(l => {
      const quantity = parseFloat(l.quantity) || 0;
      const rate = parseFloat(l.rate) || 0;
      return { item: parseInt(l.item_id), quantity, rate, amount: (quantity * rate).toFixed(2) };
    });

  const validateLines = (lines: LineForm[]): boolean => {
    const invalid = lines.some(l => !l.item_id || !(parseFloat(l.quantity) > 0) || !(parseFloat(l.rate) >= 0));
    if (invalid) { alert('Each line needs an item, a quantity above zero and a rate.'); return false; }
    return true;
  };

  const sumLines = (lines: LineForm[]) =>
    lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.rate) || 0), 0);

  const handleSaveInvoice = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const selCust = customers.find(c => c.id === parseInt(invoiceForm.customer_id));
    if (!selCust) { alert('Select a customer'); return; }
    if (!validateLines(invoiceForm.lines)) return;

    const lineItems = buildLines(invoiceForm.lines);
    const net = sumLines(invoiceForm.lines);
    const tax = (net * (parseFloat(invoiceForm.tax_rate) || 0)) / 100;
    try {
      const url = editingId ? `${API_BASE}/selling/invoices/${editingId}/` : `${API_BASE}/selling/invoices/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: invoiceForm.invoice_number, customer: selCust.id, customer_name: selCust.customer_name,
          posting_date: invoiceForm.posting_date, net_total: net.toFixed(2), tax_amount: tax.toFixed(2), grand_total: (net + tax).toFixed(2),
          status: invoiceForm.status, items: lineItems
        })
      });
      if (!res.ok) throw new Error('Failed to save sales invoice');
      setShowInvoiceModal(false);
      setEditingId(null);
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  const handleSavePurchase = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const selSupp = suppliers.find(s => s.id === parseInt(purchaseForm.supplier_id));
    if (!selSupp) { alert('Select a supplier'); return; }
    if (!validateLines(purchaseForm.lines)) return;

    const lineItems = buildLines(purchaseForm.lines);
    const net = sumLines(purchaseForm.lines);
    const tax = (net * (parseFloat(purchaseForm.tax_rate) || 0)) / 100;
    try {
      const url = editingId ? `${API_BASE}/buying/invoices/${editingId}/` : `${API_BASE}/buying/invoices/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_number: purchaseForm.bill_number, supplier: selSupp.id, supplier_name: selSupp.supplier_name,
          posting_date: purchaseForm.posting_date, net_total: net.toFixed(2), tax_amount: tax.toFixed(2), grand_total: (net + tax).toFixed(2),
          status: purchaseForm.status, items: lineItems
        })
      });
      if (!res.ok) throw new Error('Failed to save purchase bill');
      setShowPurchaseModal(false);
      setEditingId(null);
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  const handleSavePayment = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.paid_amount);
    if (!paymentForm.party_name || !amount || amount <= 0) { alert('Enter valid party and amount'); return; }
    // Derive party_type from payment_type so the stored entry can never
    // disagree with the party it was paid to or received from.
    const partyType = paymentForm.payment_type === 'Receive' ? 'Customer' : 'Supplier';
    try {
      const res = await fetch(`${API_BASE}/accounts/payments/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentForm, party_type: partyType, paid_amount: amount.toFixed(2) })
      });
      if (!res.ok) throw new Error('Payment failed');
      setShowPaymentModal(false);
      loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  const allPartyNames = Array.from(new Set([
    ...customers.map(c => c.customer_name),
    ...suppliers.map(s => s.supplier_name)
  ]));

  const totalDebit = glEntries.reduce((sum, r) => sum + Number(r.debit), 0);
  const totalCredit = glEntries.reduce((sum, r) => sum + Number(r.credit), 0);
  const closingBalance = glEntries.length > 0 ? glEntries[glEntries.length - 1].balance : 0;

  // Live totals for the invoice / purchase forms
  const invoiceNet = sumLines(invoiceForm.lines);
  const invoiceTax = (invoiceNet * (parseFloat(invoiceForm.tax_rate) || 0)) / 100;
  const purchaseNet = sumLines(purchaseForm.lines);
  const purchaseTax = (purchaseNet * (parseFloat(purchaseForm.tax_rate) || 0)) / 100;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', background: '#f8fafc', color: '#0f172a' }}>
      {/* Sidebar */}
      <aside className="no-print" style={{ width: '250px', background: '#090d16', color: '#f8fafc', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8', margin: '0 0 4px 8px' }}>TallyBIZ ERP</h2>
          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>MODULAR ENGINE</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button onClick={() => setActiveTab('selling')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'selling' ? '#1e293b' : 'transparent', color: activeTab === 'selling' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <ShoppingCart size={18} /> Selling (Invoices)
          </button>
          <button onClick={() => setActiveTab('buying')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'buying' ? '#1e293b' : 'transparent', color: activeTab === 'buying' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <ShoppingBag size={18} /> Buying (Bills)
          </button>
          <button onClick={() => setActiveTab('customers')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'customers' ? '#1e293b' : 'transparent', color: activeTab === 'customers' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <Users size={18} /> Customers
          </button>
          <button onClick={() => setActiveTab('suppliers')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'suppliers' ? '#1e293b' : 'transparent', color: activeTab === 'suppliers' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <Truck size={18} /> Suppliers
          </button>
          <button onClick={() => setActiveTab('payments')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'payments' ? '#1e293b' : 'transparent', color: activeTab === 'payments' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <CreditCard size={18} /> Payments
          </button>
          <button onClick={() => setActiveTab('stock')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'stock' ? '#1e293b' : 'transparent', color: activeTab === 'stock' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <Package size={18} /> Stock (Items)
          </button>
          <button onClick={() => setActiveTab('stock-ledger')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'stock-ledger' ? '#1e293b' : 'transparent', color: activeTab === 'stock-ledger' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <Layers size={18} /> Stock Movement Ledger
          </button>
          <button onClick={() => setActiveTab('accounts')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'accounts' ? '#1e293b' : 'transparent', color: activeTab === 'accounts' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <BookOpen size={18} /> General Ledger
          </button>
          <button onClick={() => setActiveTab('reports')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'reports' ? '#1e293b' : 'transparent', color: activeTab === 'reports' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <PieChart size={18} /> Profit & Loss / Balance Sheet
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>
        {/* Load status banner - a failed request must never look like "no data" */}
        {loadError && (
          <div
            role="alert"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px',
              padding: '12px 16px', borderRadius: '8px',
              background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px'
            }}
          >
            <X size={16} />
            <span style={{ flex: 1 }}>{loadError}</span>
            <button
              onClick={() => loadData()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff', color: '#b91c1c', fontWeight: '600' }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#64748b', fontSize: '13px' }}>
            <RefreshCw size={14} className="spin" /> Loading data...
          </div>
        )}
        {/* TAB 1: SELLING */}
        {activeTab === 'selling' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Sales Invoices</h1><p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Customer sales with GST & automatic inventory deductions</p></div>
              <button onClick={() => { setEditingId(null); setInvoiceForm(prev => ({ ...prev, invoice_number: getNextInvoiceNumber(invoices), customer_id: '', tax_rate: '18', status: 'Submitted', lines: [newLine()] })); setShowInvoiceModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> New Invoice</button>
            </div>
            <DataTable<SalesInvoice> 
              columns={[
                { header: 'Invoice #', accessor: 'invoice_number' }, 
                { header: 'Customer', accessor: 'customer_name' }, 
                { header: 'Posting Date', accessor: 'posting_date' }, 
                { header: 'Net (Rs.)', accessor: r => `Rs. ${r.net_total}` }, 
                { header: 'Tax (Rs.)', accessor: r => `Rs. ${r.tax_amount}` }, 
                { header: 'Grand Total (Rs.)', accessor: r => <strong>Rs. {r.grand_total}</strong> },
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
                            tax_rate: inferTaxRate(row.net_total, row.tax_amount),
                            status: row.status || 'Submitted',
                            // Load every line, not just the first - the backend
                            // deletes all lines and recreates them from this list.
                            lines: row.items?.length ? row.items.map(lineFromItem) : [newLine()]
                          });
                          setShowInvoiceModal(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#475569' }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteInvoice(row.id!, row.invoice_number)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#b91c1c' }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )
                }
              ]} 
              data={invoices} 
              emptyMessage="No sales invoices created yet." 
            />
          </div>
        )}

        {/* TAB 2: BUYING */}
        {activeTab === 'buying' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Purchase Bills (Buying)</h1><p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Inward supplier bills, input GST credits & inventory replenishment</p></div>
              <button onClick={() => { setEditingId(null); setPurchaseForm(prev => ({ ...prev, bill_number: getNextPurchaseNumber(purchases), supplier_id: '', tax_rate: '18', status: 'Submitted', lines: [newLine()] })); setShowPurchaseModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> New Purchase Bill</button>
            </div>
            <DataTable<PurchaseInvoice> 
              columns={[
                { header: 'Bill #', accessor: 'bill_number' }, 
                { header: 'Supplier', accessor: 'supplier_name' }, 
                { header: 'Posting Date', accessor: 'posting_date' }, 
                { header: 'Net (Rs.)', accessor: r => `Rs. ${r.net_total}` }, 
                { header: 'Input Tax (Rs.)', accessor: r => `Rs. ${r.tax_amount}` }, 
                { header: 'Total Payable (Rs.)', accessor: r => <strong>Rs. {r.grand_total}</strong> },
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
                            tax_rate: inferTaxRate(row.net_total, row.tax_amount),
                            status: row.status || 'Submitted',
                            // Load every line, not just the first - the backend
                            // deletes all lines and recreates them from this list.
                            lines: row.items?.length ? row.items.map(lineFromItem) : [newLine()]
                          });
                          setShowPurchaseModal(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1' }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeletePurchase(row.id!, row.bill_number)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#b91c1c' }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )
                }
              ]} 
              data={purchases} 
              emptyMessage="No purchase bills recorded yet." 
            />
          </div>
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Customers</h1><p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Customer registry & party master</p></div>
              <button onClick={() => { setEditingId(null); setCustomerForm({ customer_name: '', customer_type: 'Company', gst_category: 'Unregistered', gstin: '', email: '', mobile_no: '', city: '', postal_code: '' }); setShowCustomerModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> New Customer</button>
            </div>
            <DataTable<Customer> 
              columns={[
                { header: 'Customer Name', accessor: 'customer_name' }, 
                { header: 'Type', accessor: 'customer_type' }, 
                { header: 'GSTIN', accessor: r => r.gstin || '-' }, 
                { header: 'City', accessor: r => r.city || '-' },
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
        )}

        {/* TAB 4: SUPPLIERS */}
        {activeTab === 'suppliers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Suppliers (Vendors)</h1><p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Supplier registry with GSTIN & accounts tracking</p></div>
              <button onClick={() => { setEditingId(null); setSupplierForm({ supplier_name: '', supplier_type: 'Company', gst_category: 'Registered Regular', gstin: '', email: '', mobile_no: '', city: '', postal_code: '' }); setShowSupplierModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> New Supplier</button>
            </div>
            <DataTable<Supplier> 
              columns={[
                { header: 'Supplier Name', accessor: 'supplier_name' }, 
                { header: 'GSTIN', accessor: r => r.gstin || '-' }, 
                { header: 'GST Category', accessor: 'gst_category' }, 
                { header: 'City', accessor: r => r.city || '-' },
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
        )}

        {/* TAB 5: PAYMENTS */}
        {activeTab === 'payments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Payment Entries</h1><p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Customer receipts & supplier vendor payments</p></div>
              <button onClick={() => { setPaymentForm(prev => ({ ...prev, voucher_no: getNextPaymentNumber(payments), payment_type: 'Receive', party_type: 'Customer', party_name: '', paid_amount: '0', reference_no: '', remarks: '' })); setShowPaymentModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> Make / Receive Payment</button>
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
                    <button 
                      onClick={() => setSelectedPaymentForPrint(row)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1', fontWeight: '500' }}
                    >
                      <Printer size={12} /> Print
                    </button>
                  )
                }
              ]} 
              data={payments} 
              emptyMessage="No payment entries yet." 
            />  
          </div>
        )}

        {/* TAB 6: STOCK */}
        {activeTab === 'stock' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Stock Items</h1><p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Current warehouse inventory balance</p></div>
              <button onClick={() => { setEditingId(null); setItemForm({ item_code: '', item_name: '', category: 'General', unit: 'Nos', standard_rate: '0', current_stock: '0' }); setShowItemModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> New Item</button>
            </div>
            <DataTable<Item> 
              columns={[
                { header: 'Code', accessor: 'item_code' }, 
                { header: 'Item Name', accessor: 'item_name' }, 
                { header: 'Category', accessor: 'category' }, 
                { header: 'Rate (Rs.)', accessor: r => `Rs. ${r.standard_rate}` }, 
                { header: 'Current Stock', accessor: r => <strong>{r.current_stock} {r.unit}</strong> },
                {
                  header: 'Action',
                  accessor: (row) => (
                    <button 
                      onClick={() => {
                        setEditingId(row.id || null);
                        setItemForm({
                          item_code: row.item_code,
                          item_name: row.item_name,
                          category: row.category,
                          unit: row.unit,
                          standard_rate: row.standard_rate.toString(),
                          current_stock: row.current_stock.toString()
                        });
                        setShowItemModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1' }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                  )
                }
              ]} 
              data={items} 
              emptyMessage="No items registered in stock." 
            />
          </div>
        )}

        {/* TAB 7: STOCK MOVEMENT LEDGER */}
        {activeTab === 'stock-ledger' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Stock Movement & Valuation Ledger</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Chronological register of inward receipts, outward issues & item balances</p>
              </div>
              <button 
                onClick={() => setStockItemFilter('all')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '500' }}
              >
                <RefreshCw size={14} /> Reset Item Filter
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: '600', fontSize: '14px' }}>
                <Filter size={16} /> Filter by Item:
              </div>
              <div style={{ flex: 1, maxWidth: '400px' }}>
                <select 
                  value={stockItemFilter} 
                  onChange={e => setStockItemFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#0f172a' }}
                >
                  <option value="all" style={{ color: '#0f172a' }}>All Inventory Items</option>
                  {items.map(it => (
                    <option key={it.id} value={it.id} style={{ color: '#0f172a' }}>{it.item_name} ({it.item_code})</option>
                  ))}
                </select>
              </div>
            </div>

            <DataTable<StockLedgerRow> 
              columns={[
                { header: 'Date', accessor: 'posting_date' },
                { header: 'Item Name', accessor: r => <strong>{r.item_name} ({r.item_code})</strong> },
                { header: 'Voucher', accessor: r => `${r.voucher_type} #${r.voucher_no}` },
                { header: 'Inward (+)', accessor: r => r.in_qty > 0 ? <span style={{ color: '#15803d', fontWeight: '600' }}>+{r.in_qty}</span> : '-' },
                { header: 'Outward (-)', accessor: r => r.out_qty > 0 ? <span style={{ color: '#b91c1c', fontWeight: '600' }}>-{r.out_qty}</span> : '-' },
                { header: 'Balance Qty', accessor: r => <strong>{r.balance_qty}</strong> },
                { header: 'Valuation Rate', accessor: r => `Rs. ${r.valuation_rate.toFixed(2)}` },
                { header: 'Total Value', accessor: r => <strong style={{ color: '#0284c7' }}>Rs. {r.balance_value.toFixed(2)}</strong> }
              ]}
              data={stockLedger}
              emptyMessage="No stock transactions found for the selected criteria."
            />
          </div>
        )}

        {/* TAB 8: GL WITH FILTERS */}
        {activeTab === 'accounts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>General Ledger Entries</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Unified double-entry bookkeeping ledger & individual party statements</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setShowLedgerPrintModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                  <Printer size={14} /> Print Statement
                </button>
                <button 
                  onClick={() => { setGlAccountFilter('all'); setGlPartyFilter('all'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '500' }}
                >
                  <RefreshCw size={14} /> Reset Filters
                </button>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: '600', fontSize: '14px' }}>
                <Filter size={16} /> Filters:
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Filter by Account</label>
                <select 
                  value={glAccountFilter} 
                  onChange={e => setGlAccountFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#0f172a' }}
                >
                  <option value="all" style={{ color: '#0f172a' }}>All Accounts (Complete Ledger)</option>
                  <option value="Debtors" style={{ color: '#0f172a' }}>Debtors (Customer Accounts)</option>
                  <option value="Creditors" style={{ color: '#0f172a' }}>Creditors (Supplier Accounts)</option>
                  <option value="Bank Account" style={{ color: '#0f172a' }}>Bank Account</option>
                  <option value="Sales Income" style={{ color: '#0f172a' }}>Sales Income</option>
                  <option value="Stock Received But Not Billed" style={{ color: '#0f172a' }}>Stock Received (Purchases)</option>
                  <option value="Input GST" style={{ color: '#0f172a' }}>Input GST</option>
                  <option value="Output GST" style={{ color: '#0f172a' }}>Output GST</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Filter by Party (Customer / Supplier)</label>
                <select 
                  value={glPartyFilter} 
                  onChange={e => setGlPartyFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#0f172a' }}
                >
                  <option value="all" style={{ color: '#0f172a' }}>All Parties</option>
                  {allPartyNames.map((p, idx) => (
                    <option key={idx} value={p} style={{ color: '#0f172a' }}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Total Debits:</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#0369a1' }}>Rs. {totalDebit.toFixed(2)}</h3>
              </div>
              <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Total Credits:</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#15803d' }}>Rs. {totalCredit.toFixed(2)}</h3>
              </div>
              <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Statement Closing Balance:</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: closingBalance >= 0 ? '#0f172a' : '#b91c1c' }}>
                  Rs. {Math.abs(closingBalance).toFixed(2)} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                </h3>
              </div>
            </div>

            <DataTable<GLEntryRow> 
              columns={[
                { header: 'Date', accessor: 'posting_date' }, 
                { header: 'Voucher', accessor: r => <strong>{r.voucher_type} #{r.voucher_no}</strong> }, 
                { header: 'Account', accessor: 'account' }, 
                { header: 'Party', accessor: r => r.party || '-' }, 
                { header: 'Debit (Rs.)', accessor: r => Number(r.debit) > 0 ? <span style={{ color: '#0369a1', fontWeight: '600' }}>Rs. {Number(r.debit).toFixed(2)}</span> : '-' }, 
                { header: 'Credit (Rs.)', accessor: r => Number(r.credit) > 0 ? <span style={{ color: '#15803d', fontWeight: '600' }}>Rs. {Number(r.credit).toFixed(2)}</span> : '-' }, 
                { header: 'Running Bal (Rs.)', accessor: r => <strong>Rs. {Number(r.balance).toFixed(2)}</strong> }
              ]} 
              data={glEntries} 
              emptyMessage="No ledger entries match the selected filters." 
            />
          </div>
        )}

        {/* TAB 9: REPORTS */}
        {activeTab === 'reports' && (finance ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Financial Statements</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Real-time Profit & Loss and Balance Sheet derived from General Ledger</p>
              </div>
              <button 
                onClick={() => setShowFinancePrintModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
              >
                <Printer size={16} /> Print Financial Statements
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>Profit & Loss Statement</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sales Income:</span><strong>Rs. {finance.income.sales.toFixed(2)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}><span>Purchases:</span><strong>- Rs. {finance.expense.purchases.toFixed(2)}</strong></div>
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: finance.profit.gross_profit >= 0 ? '#15803d' : '#b91c1c' }}>
                    <span>Gross Profit / (Loss):</span><span>Rs. {finance.profit.gross_profit.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>GST Tax Settlement</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Output GST:</span><strong>Rs. {finance.gst.output_liability.toFixed(2)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}><span>Input GST ITC:</span><strong>- Rs. {finance.gst.input_itc.toFixed(2)}</strong></div>
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: finance.gst.net_payable > 0 ? '#b91c1c' : '#0284c7' }}>
                    <span>{finance.gst.net_payable > 0 ? 'Net GST Payable:' : 'Eligible ITC Refund:'}</span>
                    <span>Rs. {Math.abs(finance.gst.net_payable).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>Balance Sheet</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', marginBottom: '12px' }}>Assets</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bank & Cash:</span><strong>Rs. {finance.balance_sheet.assets.bank_cash.toFixed(2)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Debtors:</span><strong>Rs. {finance.balance_sheet.assets.debtors_receivable.toFixed(2)}</strong></div>
                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#0369a1' }}><span>Total Current Assets:</span><span>Rs. {finance.balance_sheet.assets.total_assets.toFixed(2)}</span></div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', marginBottom: '12px' }}>Liabilities</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Creditors:</span><strong>Rs. {finance.balance_sheet.liabilities.creditors_payable.toFixed(2)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST Tax Payable:</span><strong>Rs. {finance.balance_sheet.liabilities.gst_payable.toFixed(2)}</strong></div>
                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#b91c1c' }}><span>Total Current Liabilities:</span><span>Rs. {finance.balance_sheet.liabilities.total_liabilities.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', padding: '48px 32px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              {loading
                ? 'Loading financial statements...'
                : loadError
                  ? 'Financial statements could not be loaded. Check the banner above and retry.'
                  : 'No financial statements available yet.'}
            </p>
          </div>
        ))}
      </main>

      {/* Invoice Print Modal */}
      {selectedInvoiceForPrint && (
        <InvoicePrintModal
          invoice={selectedInvoiceForPrint}
          customer={customers.find(c => c.id === selectedInvoiceForPrint.customer || c.customer_name === selectedInvoiceForPrint.customer_name)}
          itemsMaster={items}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}

      {/* Purchase Bill Print Modal */}
      {selectedPurchaseForPrint && (
        <PurchaseBillPrintModal
          bill={selectedPurchaseForPrint}
          supplier={suppliers.find(s => s.id === selectedPurchaseForPrint.supplier || s.supplier_name === selectedPurchaseForPrint.supplier_name)}
          itemsMaster={items}
          onClose={() => setSelectedPurchaseForPrint(null)}
        />
      )}

      {/* Payment Print Modal */}
      {selectedPaymentForPrint && (
        <PaymentPrintModal
          payment={selectedPaymentForPrint}
          onClose={() => setSelectedPaymentForPrint(null)}
        />
      )}

      {/* Ledger Statement Print Modal */}
      {showLedgerPrintModal && (
        <LedgerPrintModal
          entries={glEntries}
          accountFilter={glAccountFilter}
          partyFilter={glPartyFilter}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          closingBalance={closingBalance}
          onClose={() => setShowLedgerPrintModal(false)}
        />
      )}

      {/* Financial Statements Print Modal */}
      {showFinancePrintModal && (
        <FinancialReportPrintModal finance={finance} onClose={() => setShowFinancePrintModal(false)} />
      )}

      {/* Modals with red cancel buttons */}
      {showSupplierModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Edit Supplier' : 'New Supplier'}</h3><button onClick={() => setShowSupplierModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Supplier Name *</label><input required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={supplierForm.supplier_name} onChange={e => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>GSTIN</label><input style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={supplierForm.gstin || ''} onChange={e => setSupplierForm({ ...supplierForm, gstin: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>City</label><input style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={supplierForm.city || ''} onChange={e => setSupplierForm({ ...supplierForm, city: e.target.value })} /></div><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Mobile</label><input style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={supplierForm.mobile_no || ''} onChange={e => setSupplierForm({ ...supplierForm, mobile_no: e.target.value })} /></div></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowSupplierModal(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Update Supplier' : 'Save Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '780px', maxWidth: '94vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Edit Purchase Bill' : 'Record Purchase Bill'}</h3><button onClick={() => setShowPurchaseModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Bill #</label><input required disabled={!!editingId} style={{ ...fieldStyle, background: editingId ? '#f1f5f9' : '#fff' }} value={purchaseForm.bill_number} onChange={e => setPurchaseForm({ ...purchaseForm, bill_number: e.target.value })} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Posting Date</label><input type="date" required style={fieldStyle} value={purchaseForm.posting_date} onChange={e => setPurchaseForm({ ...purchaseForm, posting_date: e.target.value })} /></div>
                <div style={{ width: '110px' }}><label style={{ fontSize: '12px', fontWeight: '600' }}>GST %</label><select style={fieldStyle} value={purchaseForm.tax_rate} onChange={e => setPurchaseForm({ ...purchaseForm, tax_rate: e.target.value })}>{GST_SLABS.map(s => (<option key={s} value={s}>{s}%</option>))}</select></div>
              </div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Select Supplier *</label><select required style={fieldStyle} value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}><option value="">-- Choose Supplier --</option>{suppliers.map(s => (<option key={s.id} value={s.id}>{s.supplier_name}</option>))}</select></div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Line Items</label>
                <LineItemsEditor
                  lines={purchaseForm.lines}
                  items={items}
                  showStock={false}
                  onChange={lines => setPurchaseForm(prev => ({ ...prev, lines }))}
                />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Net Total</span><strong>Rs. {purchaseNet.toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Input GST ({purchaseForm.tax_rate}%)</span><strong>Rs. {purchaseTax.toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px', fontSize: '15px' }}><strong>Total Payable</strong><strong style={{ color: '#0369a1' }}>Rs. {(purchaseNet + purchaseTax).toFixed(2)}</strong></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowPurchaseModal(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Update Bill' : 'Submit Bill'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Edit Customer' : 'New Customer'}</h3><button onClick={() => setShowCustomerModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Customer Name *</label><input required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={customerForm.customer_name} onChange={e => setCustomerForm({ ...customerForm, customer_name: e.target.value })} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>GSTIN</label><input style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={customerForm.gstin || ''} onChange={e => setCustomerForm({ ...customerForm, gstin: e.target.value })} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCustomerModal(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Update Customer' : 'Save Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Edit Item' : 'Create New Item'}</h3><button onClick={() => setShowItemModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Item Code</label><input required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={itemForm.item_code} onChange={e => setItemForm({ ...itemForm, item_code: e.target.value })} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Item Name</label><input required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={itemForm.item_name} onChange={e => setItemForm({ ...itemForm, item_name: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Rate (Rs.)</label><input type="number" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={itemForm.standard_rate} onChange={e => setItemForm({ ...itemForm, standard_rate: e.target.value })} /></div><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Stock</label><input type="number" readOnly title="Derived from the Stock Ledger - it updates automatically as purchases and sales are posted." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px', boxSizing: 'border-box', background: '#f1f5f9', color: '#64748b' }} value={itemForm.current_stock} /><span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Derived from Stock Ledger</span></div></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowItemModal(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Update Item' : 'Save Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInvoiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '780px', maxWidth: '94vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Edit Sales Invoice' : 'Create Sales Invoice'}</h3><button onClick={() => setShowInvoiceModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Invoice #</label><input required disabled={!!editingId} style={{ ...fieldStyle, background: editingId ? '#f1f5f9' : '#fff' }} value={invoiceForm.invoice_number} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Date</label><input type="date" required style={fieldStyle} value={invoiceForm.posting_date} onChange={e => setInvoiceForm({ ...invoiceForm, posting_date: e.target.value })} /></div>
                <div style={{ width: '110px' }}><label style={{ fontSize: '12px', fontWeight: '600' }}>GST %</label><select style={fieldStyle} value={invoiceForm.tax_rate} onChange={e => setInvoiceForm({ ...invoiceForm, tax_rate: e.target.value })}>{GST_SLABS.map(s => (<option key={s} value={s}>{s}%</option>))}</select></div>
              </div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Customer</label><select required style={fieldStyle} value={invoiceForm.customer_id} onChange={e => setInvoiceForm({ ...invoiceForm, customer_id: e.target.value })}><option value="">-- Choose Customer --</option>{customers.map(c => (<option key={c.id} value={c.id}>{c.customer_name}</option>))}</select></div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Line Items</label>
                <LineItemsEditor
                  lines={invoiceForm.lines}
                  items={items}
                  showStock={true}
                  onChange={lines => setInvoiceForm(prev => ({ ...prev, lines }))}
                />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Net Total</span><strong>Rs. {invoiceNet.toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span>Output GST ({invoiceForm.tax_rate}%)</span><strong>Rs. {invoiceTax.toFixed(2)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px', fontSize: '15px' }}><strong>Grand Total</strong><strong style={{ color: '#0369a1' }}>Rs. {(invoiceNet + invoiceTax).toFixed(2)}</strong></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowInvoiceModal(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Update Invoice' : 'Submit Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Payment Entry</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>Payment Type</label>
                  <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.payment_type} onChange={e => {
                    const type = e.target.value as 'Receive' | 'Pay';
                    // party_type follows payment_type, and the selected party is
                    // cleared because the two lists are disjoint.
                    setPaymentForm(prev => ({
                      ...prev,
                      payment_type: type,
                      party_type: type === 'Receive' ? 'Customer' : 'Supplier',
                      party_name: ''
                    }));
                  }}>
                    <option value="Receive">Receive (From Customer)</option>
                    <option value="Pay">Pay (To Supplier)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>Mode</label>
                  <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.mode_of_payment} onChange={e => setPaymentForm({ ...paymentForm, mode_of_payment: e.target.value as PaymentEntry['mode_of_payment'] })}>
                    <option value="Bank">Bank Transfer / UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Party Name *</label>
                <select required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.party_name} onChange={e => setPaymentForm({ ...paymentForm, party_name: e.target.value })}>
                  <option value="">-- Choose Party --</option>
                  {paymentForm.payment_type === 'Receive' ? customers.map(c => <option key={c.id} value={c.customer_name}>{c.customer_name}</option>) : suppliers.map(s => <option key={s.id} value={s.supplier_name}>{s.supplier_name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Amount (Rs.) *</label>
                <input type="number" step="0.01" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.paid_amount} onChange={e => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })} />
              </div>

              {/* Reference / UTR Number Field */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Reference / UTR / Cheque No</label>
                <input 
                  placeholder="e.g. UPI-123456789 or CHQ-00123" 
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} 
                  value={paymentForm.reference_no || ''} 
                  onChange={e => setPaymentForm({ ...paymentForm, reference_no: e.target.value })} 
                />
              </div>

              {/* Remarks / Narration Field */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Remarks / Narration</label>
                <input 
                  placeholder="e.g. Paid against Invoice INV-0002" 
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} 
                  value={paymentForm.remarks || ''} 
                  onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

