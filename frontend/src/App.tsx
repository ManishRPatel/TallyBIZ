import { useState, useEffect } from 'react';
import { DataTable } from './components/DataTable';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import type { Customer, Supplier, Item, GLEntryRow, SalesInvoice, PurchaseInvoice, PaymentEntry } from './types/erp';
import { ShoppingCart, ShoppingBag, Users, Truck, Package, BookOpen, CreditCard, PieChart, Plus, X, Edit2, Printer, Filter, RefreshCw } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const getNextInvoiceNumber = (list: SalesInvoice[]) => `INV-${String(list.length + 1).padStart(4, '0')}`;
const getNextPurchaseNumber = (list: PurchaseInvoice[]) => `PUR-${String(list.length + 1).padStart(4, '0')}`;
const getNextPaymentNumber = (list: PaymentEntry[]) => `PAY-${String(list.length + 1).padStart(4, '0')}`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'selling' | 'buying' | 'customers' | 'suppliers' | 'payments' | 'stock' | 'accounts' | 'reports'>('selling');
  
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [glEntries, setGlEntries] = useState<GLEntryRow[]>([]);
  const [finance, setFinance] = useState<any>(null);

  // GL Filters State
  const [glAccountFilter, setGlAccountFilter] = useState<string>('all');
  const [glPartyFilter, setGlPartyFilter] = useState<string>('all');

  // Print Modal State
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<SalesInvoice | null>(null);

  // Edit Tracking
  const [editingId, setEditingId] = useState<number | null>(null);

  // Modal states
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

  const [invoiceForm, setInvoiceForm] = useState({
    invoice_number: 'INV-0001', customer_id: '', posting_date: new Date().toISOString().split('T')[0], item_id: '', quantity: '1', rate: '0', tax_rate: '18'
  });

  const [purchaseForm, setPurchaseForm] = useState({
    bill_number: 'PUR-0001', supplier_id: '', posting_date: new Date().toISOString().split('T')[0], item_id: '', quantity: '1', rate: '0', tax_rate: '18'
  });

  const [paymentForm, setPaymentForm] = useState({
    voucher_no: 'PAY-0001', payment_type: 'Receive' as 'Receive' | 'Pay', posting_date: new Date().toISOString().split('T')[0], party_type: 'Customer', party_name: '', mode_of_payment: 'Bank' as 'Bank' | 'Cash' | 'Cheque', paid_amount: '0', reference_no: '', remarks: ''
  });

  const loadData = async () => {
    try {
      const glParams = new URLSearchParams();
      if (glAccountFilter !== 'all') glParams.append('account', glAccountFilter);
      if (glPartyFilter !== 'all') glParams.append('party', glPartyFilter);

      const [resCust, resSupp, resItems, resInvoices, resPurch, resPay, resGL, resFin] = await Promise.all([
        fetch(`${API_BASE}/selling/customers/`),
        fetch(`${API_BASE}/buying/suppliers/`),
        fetch(`${API_BASE}/stock/items/`),
        fetch(`${API_BASE}/selling/invoices/`),
        fetch(`${API_BASE}/buying/invoices/`),
        fetch(`${API_BASE}/accounts/payments/`),
        fetch(`${API_BASE}/accounts/general-ledger/?${glParams.toString()}`),
        fetch(`${API_BASE}/accounts/financial-statements/`)
      ]);
      if (resCust.ok) setCustomers(await resCust.json());
      if (resSupp.ok) setSuppliers(await resSupp.json());
      if (resItems.ok) setItems(await resItems.json());
      if (resInvoices.ok) setInvoices(await resInvoices.json());
      if (resPurch.ok) setPurchases(await resPurch.json());
      if (resPay.ok) setPayments(await resPay.json());
      if (resGL.ok) setGlEntries(await resGL.json());
      if (resFin.ok) setFinance(await resFin.json());
    } catch (err) {
      console.error("API error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, glAccountFilter, glPartyFilter]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
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
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
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
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/stock/items/${editingId}/` : `${API_BASE}/stock/items/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...itemForm, standard_rate: parseFloat(itemForm.standard_rate) || 0, current_stock: parseFloat(itemForm.current_stock) || 0 })
      });
      if (!res.ok) throw new Error('Failed to save item');
      setShowItemModal(false);
      setEditingId(null);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const selCust = customers.find(c => c.id === parseInt(invoiceForm.customer_id));
    if (!selCust || !invoiceForm.item_id) { alert('Select customer & item'); return; }
    const q = parseFloat(invoiceForm.quantity) || 0;
    const r = parseFloat(invoiceForm.rate) || 0;
    const net = q * r;
    const tax = (net * parseFloat(invoiceForm.tax_rate)) / 100;
    try {
      const url = editingId ? `${API_BASE}/selling/invoices/${editingId}/` : `${API_BASE}/selling/invoices/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: invoiceForm.invoice_number, customer: selCust.id, customer_name: selCust.customer_name,
          posting_date: invoiceForm.posting_date, net_total: net.toFixed(2), tax_amount: tax.toFixed(2), grand_total: (net + tax).toFixed(2),
          status: 'Submitted', items: [{ item: parseInt(invoiceForm.item_id), quantity: q, rate: r, amount: net.toFixed(2) }]
        })
      });
      if (!res.ok) throw new Error('Failed to save sales invoice');
      setShowInvoiceModal(false);
      setEditingId(null);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const selSupp = suppliers.find(s => s.id === parseInt(purchaseForm.supplier_id));
    if (!selSupp || !purchaseForm.item_id) { alert('Select supplier & item'); return; }
    const q = parseFloat(purchaseForm.quantity) || 0;
    const r = parseFloat(purchaseForm.rate) || 0;
    const net = q * r;
    const tax = (net * parseFloat(purchaseForm.tax_rate)) / 100;
    try {
      const url = editingId ? `${API_BASE}/buying/invoices/${editingId}/` : `${API_BASE}/buying/invoices/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_number: purchaseForm.bill_number, supplier: selSupp.id, supplier_name: selSupp.supplier_name,
          posting_date: purchaseForm.posting_date, net_total: net.toFixed(2), tax_amount: tax.toFixed(2), grand_total: (net + tax).toFixed(2),
          status: 'Submitted', items: [{ item: parseInt(purchaseForm.item_id), quantity: q, rate: r, amount: net.toFixed(2) }]
        })
      });
      if (!res.ok) throw new Error('Failed to save purchase bill');
      setShowPurchaseModal(false);
      setEditingId(null);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.paid_amount);
    if (!paymentForm.party_name || !amount || amount <= 0) { alert('Enter valid party and amount'); return; }
    try {
      const res = await fetch(`${API_BASE}/accounts/payments/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentForm, paid_amount: amount.toFixed(2) })
      });
      if (!res.ok) throw new Error('Payment failed');
      setShowPaymentModal(false);
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  // Distinct parties for filter
  const allPartyNames = Array.from(new Set([
    ...customers.map(c => c.customer_name),
    ...suppliers.map(s => s.supplier_name)
  ]));

  // Calculate filtered GL totals
  const totalDebit = glEntries.reduce((sum, r) => sum + Number(r.debit), 0);
  const totalCredit = glEntries.reduce((sum, r) => sum + Number(r.credit), 0);
  const closingBalance = glEntries.length > 0 ? glEntries[glEntries.length - 1].balance : 0;

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
        {/* TAB 1: SELLING */}
        {activeTab === 'selling' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Sales Invoices</h1><p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Customer sales with GST & automatic inventory deductions</p></div>
              <button onClick={() => { setEditingId(null); setInvoiceForm(prev => ({ ...prev, invoice_number: getNextInvoiceNumber(invoices), customer_id: '', item_id: '', quantity: '1', rate: '0', tax_rate: '18' })); setShowInvoiceModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> New Invoice</button>
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
                            item_id: row.items?.[0] ? row.items[0].item.toString() : '',
                            quantity: row.items?.[0] ? row.items[0].quantity.toString() : '1',
                            rate: row.items?.[0] ? row.items[0].rate.toString() : '0',
                            tax_rate: '18'
                          });
                          setShowInvoiceModal(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#475569' }}
                      >
                        <Edit2 size={12} /> Edit
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
              <button onClick={() => { setEditingId(null); setPurchaseForm(prev => ({ ...prev, bill_number: getNextPurchaseNumber(purchases), supplier_id: '', item_id: '', quantity: '1', rate: '0', tax_rate: '18' })); setShowPurchaseModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> New Purchase Bill</button>
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
                  header: 'Action',
                  accessor: (row) => (
                    <button 
                      onClick={() => {
                        setEditingId(row.id || null);
                        setPurchaseForm({
                          bill_number: row.bill_number,
                          supplier_id: row.supplier ? row.supplier.toString() : '',
                          posting_date: row.posting_date,
                          item_id: row.items?.[0] ? row.items[0].item.toString() : '',
                          quantity: row.items?.[0] ? row.items[0].quantity.toString() : '1',
                          rate: row.items?.[0] ? row.items[0].rate.toString() : '0',
                          tax_rate: '18'
                        });
                        setShowPurchaseModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1' }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
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
              <button onClick={() => { setPaymentForm(prev => ({ ...prev, voucher_no: getNextPaymentNumber(payments), paid_amount: '0', party_name: customers[0]?.customer_name || '' })); setShowPaymentModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}><Plus size={16} /> Make / Receive Payment</button>
            </div>
            <DataTable<PaymentEntry> columns={[{ header: 'Voucher #', accessor: 'voucher_no' }, { header: 'Date', accessor: 'posting_date' }, { header: 'Type', accessor: 'payment_type' }, { header: 'Party', accessor: 'party_name' }, { header: 'Mode', accessor: 'mode_of_payment' }, { header: 'Amount (Rs.)', accessor: r => <strong style={{ color: r.payment_type === 'Receive' ? '#15803d' : '#b91c1c' }}>Rs. {r.paid_amount}</strong> }]} data={payments} emptyMessage="No payment entries yet." />
          </div>
        )}

        {/* TAB 6: STOCK */}
        {activeTab === 'stock' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div><h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Stock Items</h1><p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Live stock ledger balance</p></div>
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

        {/* TAB 7: GL WITH FILTERS */}
        {activeTab === 'accounts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>General Ledger Entries</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Unified double-entry bookkeeping ledger & individual party statements</p>
              </div>
              <button 
                onClick={() => { setGlAccountFilter('all'); setGlPartyFilter('all'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '500' }}
              >
                <RefreshCw size={14} /> Reset Filters
              </button>
            </div>

            {/* Filter Controls Card */}
            <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: '600', fontSize: '14px' }}>
                <Filter size={16} /> Filters:
              </div>

              {/* Account Filter */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Filter by Account</label>
                <select 
                  value={glAccountFilter} 
                  onChange={e => setGlAccountFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#0f172a' }}
                >
                  <option value="all">All Accounts (Complete Ledger)</option>
                  <option value="Debtors">Debtors (Customer Accounts)</option>
                  <option value="Creditors">Creditors (Supplier Accounts)</option>
                  <option value="Bank Account">Bank Account</option>
                  <option value="Sales Income">Sales Income</option>
                  <option value="Stock Received But Not Billed">Stock Received (Purchases)</option>
                  <option value="Input GST">Input GST</option>
                  <option value="Output GST">Output GST</option>
                </select>
              </div>

              {/* Party Filter */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Filter by Party (Customer / Supplier)</label>
                <select 
                  value={glPartyFilter} 
                  onChange={e => setGlPartyFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#0f172a' }}
                >
                  <option value="all">All Parties</option>
                  {allPartyNames.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Summary Metrics */}
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

        {/* TAB 8: REPORTS */}
        {activeTab === 'reports' && finance && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Financial Statements</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Real-time Profit & Loss and Balance Sheet derived from General Ledger</p>
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
        )}
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
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Edit Purchase Bill' : 'Record Purchase Bill'}</h3><button onClick={() => setShowPurchaseModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Bill #</label><input required disabled={!!editingId} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: editingId ? '#f1f5f9' : '#fff' }} value={purchaseForm.bill_number} onChange={e => setPurchaseForm({ ...purchaseForm, bill_number: e.target.value })} /></div><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Posting Date</label><input type="date" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={purchaseForm.posting_date} onChange={e => setPurchaseForm({ ...purchaseForm, posting_date: e.target.value })} /></div></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Select Supplier *</label><select required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}><option value="">-- Choose Supplier --</option>{suppliers.map(s => (<option key={s.id} value={s.id}>{s.supplier_name}</option>))}</select></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Select Item To Buy *</label><select required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={purchaseForm.item_id} onChange={e => setPurchaseForm({ ...purchaseForm, item_id: e.target.value })}><option value="">-- Choose Item --</option>{items.map(it => (<option key={it.id} value={it.id}>{it.item_name} ({it.item_code})</option>))}</select></div>
              <div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Quantity</label><input type="number" min="1" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={purchaseForm.quantity} onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} /></div><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Purchase Rate (Rs.)</label><input type="number" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={purchaseForm.rate} onChange={e => setPurchaseForm({ ...purchaseForm, rate: e.target.value })} /></div><div style={{ width: '100px' }}><label style={{ fontSize: '12px', fontWeight: '600' }}>GST %</label><select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={purchaseForm.tax_rate} onChange={e => setPurchaseForm({ ...purchaseForm, tax_rate: e.target.value })}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></div></div>
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
              <div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Rate (Rs.)</label><input type="number" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={itemForm.standard_rate} onChange={e => setItemForm({ ...itemForm, standard_rate: e.target.value })} /></div><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Stock</label><input type="number" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={itemForm.current_stock} onChange={e => setItemForm({ ...itemForm, current_stock: e.target.value })} /></div></div>
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
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Edit Sales Invoice' : 'Create Sales Invoice'}</h3><button onClick={() => setShowInvoiceModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Invoice #</label><input required disabled={!!editingId} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: editingId ? '#f1f5f9' : '#fff' }} value={invoiceForm.invoice_number} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} /></div><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Date</label><input type="date" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={invoiceForm.posting_date} onChange={e => setInvoiceForm({ ...invoiceForm, posting_date: e.target.value })} /></div></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Customer</label><select required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={invoiceForm.customer_id} onChange={e => setInvoiceForm({ ...invoiceForm, customer_id: e.target.value })}><option value="">-- Choose Customer --</option>{customers.map(c => (<option key={c.id} value={c.id}>{c.customer_name}</option>))}</select></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Item</label><select required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={invoiceForm.item_id} onChange={e => { const sel = items.find(i => i.id === parseInt(e.target.value)); setInvoiceForm({ ...invoiceForm, item_id: e.target.value, rate: sel ? sel.standard_rate.toString() : invoiceForm.rate }); }}><option value="">-- Choose Item --</option>{items.map(it => (<option key={it.id} value={it.id}>{it.item_name}</option>))}</select></div>
              <div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Quantity</label><input type="number" min="1" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={invoiceForm.quantity} onChange={e => setInvoiceForm({ ...invoiceForm, quantity: e.target.value })} /></div><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Rate</label><input type="number" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={invoiceForm.rate} onChange={e => setInvoiceForm({ ...invoiceForm, rate: e.target.value })} /></div></div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h3 style={{ margin: 0, fontSize: '18px' }}>Payment Entry</h3><button onClick={() => setShowPaymentModal(false)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button></div>
            <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Payment Type</label><select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.payment_type} onChange={e => setPaymentForm({ ...paymentForm, payment_type: e.target.value as any })}><option value="Receive">Receive (From Customer)</option><option value="Pay">Pay (To Supplier)</option></select></div><div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Mode</label><select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.mode_of_payment} onChange={e => setPaymentForm({ ...paymentForm, mode_of_payment: e.target.value as any })}><option value="Bank">Bank Transfer / UPI</option><option value="Cash">Cash</option><option value="Cheque">Cheque</option></select></div></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Party Name *</label><select required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.party_name} onChange={e => setPaymentForm({ ...paymentForm, party_name: e.target.value })}><option value="">-- Choose Party --</option>{paymentForm.payment_type === 'Receive' ? customers.map(c => <option key={c.id} value={c.customer_name}>{c.customer_name}</option>) : suppliers.map(s => <option key={s.id} value={s.supplier_name}>{s.supplier_name}</option>)}</select></div>
              <div><label style={{ fontSize: '12px', fontWeight: '600' }}>Amount (Rs.) *</label><input type="number" step="0.01" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.paid_amount} onChange={e => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })} /></div>
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