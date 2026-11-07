import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { PurchaseBillPrintModal } from './components/PurchaseBillPrintModal';
import { PaymentPrintModal } from './components/PaymentPrintModal';
import { LedgerPrintModal } from './components/LedgerPrintModal';
import { FinancialReportPrintModal } from './components/FinancialReportPrintModal';
import { GSTPrintModal } from './components/GSTPrintModal';
import { LineItemsEditor } from './components/LineItemsEditor';
import { SellingTab } from './components/tabs/SellingTab';
import { BuyingTab } from './components/tabs/BuyingTab';
import { StockTab } from './components/tabs/StockTab';
import { PaymentsTab } from './components/tabs/PaymentsTab';
import { CustomersTab } from './components/tabs/CustomersTab';
import { SuppliersTab } from './components/tabs/SuppliersTab';
import { StockLedgerTab } from './components/tabs/StockLedgerTab';
import { AccountsTab } from './components/tabs/AccountsTab';
import { GSTTab } from './components/tabs/GSTTab';
import { ReportsTab } from './components/tabs/ReportsTab';
import { JournalEntryModal } from './components/JournalEntryModal';
import { PaymentReconciliationModal } from './components/PaymentReconciliationModal';
import type { Customer, Supplier, Item, GLEntryRow, SalesInvoice, PurchaseInvoice, PaymentEntry, StockLedgerRow, FinancialStatements, JournalEntryPayload } from './types/erp';
import { ShoppingCart, ShoppingBag, Users, Truck, Package, BookOpen, CreditCard, PieChart } from 'lucide-react';
import { X, RefreshCw, Layers } from 'lucide-react';
import { API_BASE, GST_SLABS, getErrorMessage, newLine } from './utils/erpHelpers';
import { fieldStyle, getSalesPaymentStatusMap, getPurchasePaymentStatusMap, type DashboardSummary, type LineForm } from './utils/erpHelpers';
import ReturnsTab from './components/tabs/ReturnsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'selling' | 'buying' | 'customers' | 'suppliers' | 'payments' | 'stock' | 'stock-ledger' | 'accounts' |  'ReturnsTab'  | 'reports' | 'gst'>('selling');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>({
    total_sales: 0,
    total_purchases: 0,
    bank_balance: 0
  });
  const [partyOutstanding, setPartyOutstanding] = useState<{
    customers: Record<string, number>;
    suppliers: Record<string, number>;
    total_receivable: number;
    total_payable: number;
  }>({
    customers: {},
    suppliers: {},
    total_receivable: 0,
    total_payable: 0,
  });
  const [showFinancePrintModal, setShowFinancePrintModal] = useState<boolean>(false);
  const [gstData, setGstData] = useState<any[]>([]);
  const [showGstModal, setShowGstModal] = useState<boolean>(false);
  const [showJournalModal, setShowJournalModal] = useState<boolean>(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState<boolean>(false);

  // Request status
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  // Filters & Date Range
  const [glAccountFilter, setGlAccountFilter] = useState<string>('all');
  const [glPartyFilter, setGlPartyFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
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
    invoice_number: 'INV-0001', 
    customer_id: '', 
    posting_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], // 30 days credit
    tax_rate: '18', 
    status: 'Submitted', 
    lines: [newLine()]
  }));

  const [paymentForm, setPaymentForm] = useState({
    voucher_no: 'PAY-0001', payment_type: 'Receive' as 'Receive' | 'Pay', posting_date: new Date().toISOString().split('T')[0], party_type: 'Customer', party_name: '', mode_of_payment: 'Bank' as 'Bank' | 'Cash' | 'Cheque', paid_amount: '0', reference_no: '', remarks: ''
  });

  const [purchaseForm, setPurchaseForm] = useState(() => ({
    bill_number: 'PUR-0001', 
    supplier_id: '', 
    posting_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], // 30 days credit
    tax_rate: '18', 
    status: 'Submitted', 
    lines: [newLine()]
  }));

  const loadData = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setLoadError(null);
    try {
      const glParams = new URLSearchParams();
      if (glAccountFilter !== 'all') glParams.append('account', glAccountFilter);
      if (glPartyFilter !== 'all') glParams.append('party', glPartyFilter);
      if (fromDate) glParams.append('from_date', fromDate);
      if (toDate) glParams.append('to_date', toDate);

      const stockParams = new URLSearchParams();
      if (stockItemFilter !== 'all') stockParams.append('item_id', stockItemFilter);

      const [resCust, resSupp, resItems, resInvoices, resPurch, resPay, resGL, resStock, resFin, resGST, resDash, resParty] = await Promise.all([
        fetch(`${API_BASE}/selling/customers/`),
        fetch(`${API_BASE}/buying/suppliers/`),
        fetch(`${API_BASE}/stock/items/`),
        fetch(`${API_BASE}/selling/invoices/`),
        fetch(`${API_BASE}/buying/invoices/`),
        fetch(`${API_BASE}/accounts/payments/`),
        fetch(`${API_BASE}/accounts/general-ledger/?${glParams.toString()}`),
        fetch(`${API_BASE}/stock/stock-ledger/?${stockParams.toString()}`),
        fetch(`${API_BASE}/accounts/financial-statements/`),
        fetch(`${API_BASE}/accounts/gst-returns/`),
        fetch(`${API_BASE}/accounts/dashboard-summary/`),
        fetch(`${API_BASE}/accounts/party-outstanding/`)
      ]);

      if (seq !== requestSeq.current) return;

      const failed: string[] = [];
      const read = async <T,>(label: string, res: Response): Promise<T | null> => {
        if (!res.ok) { failed.push(label); return null; }
        try { return (await res.json()) as T; }
        catch { failed.push(label); return null; }
      };

      const [cust, supp, itemList, inv, pur, pay, gl, stock, fin, gst, dash, party] = await Promise.all([
        read<Customer[]>('Customers', resCust),
        read<Supplier[]>('Suppliers', resSupp),
        read<Item[]>('Items', resItems),
        read<SalesInvoice[]>('Sales invoices', resInvoices),
        read<PurchaseInvoice[]>('Purchase bills', resPurch),
        read<PaymentEntry[]>('Payments', resPay),
        read<GLEntryRow[]>('General ledger', resGL),
        read<StockLedgerRow[]>('Stock ledger', resStock),
        read<FinancialStatements>('Financial statements', resFin),
        read<any[]>('GST returns', resGST),
        read<DashboardSummary>('Dashboard summary', resDash),
        read<any>('Party Outstanding', resParty)
      ]);

      if (cust) setCustomers(cust);
      if (supp) setSuppliers(supp);
      if (itemList) setItems(itemList);
      if (inv) setInvoices(inv);
      if (pur) setPurchases(pur);
      if (pay) setPayments(pay);
      if (gl) setGlEntries(gl);
      if (stock) setStockLedger(stock);
      if (fin) setFinance(fin);
      if (gst) setGstData(gst);
      if (dash) setDashboardSummary(dash);
      if (party) setPartyOutstanding(party);

      if (failed.length > 0) setLoadError(`Could not load: ${failed.join(', ')}.`);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error("API error:", err);
      setLoadError('Could not reach the server. Is the Django backend running on http://127.0.0.1:8000?');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [glAccountFilter, glPartyFilter, fromDate, toDate, stockItemFilter]);

  const loadDashboardSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/accounts/dashboard-summary/`);
      if (!res.ok) throw new Error('Failed to load dashboard summary');
      const data = await res.json();
      setDashboardSummary(data);
    } catch (err) {
      console.error("API error:", err);
    }
  };

  useEffect(() => {
    setSearchQuery('');
    void loadData();
    void loadDashboardSummary();
  }, [activeTab, loadData]);

    // Safe Deletion Handlers
  const handleDeleteInvoice = async (id: number, invNo: string) => {
    if (!window.confirm(`Are you sure you want to delete Sales Invoice #${invNo}? This will automatically reverse stock deduction and General Ledger entries.`)) return;
    try {
      const res = await fetch(`${API_BASE}/selling/invoices/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete invoice');
      void loadData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleDeletePurchase = async (id: number, billNo: string) => {
    if (!window.confirm(`Are you sure you want to delete Purchase Bill #${billNo}? This will automatically deduct added stock and reverse GL liabilities.`)) return;
    try {
      const res = await fetch(`${API_BASE}/buying/invoices/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete purchase bill');
      void loadData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleDeletePayment = async (id: number, voucherNo: string) => {
    if (!window.confirm(`Are you sure you want to delete Payment Entry #${voucherNo}? This will reverse General Ledger entries.`)) return;
    try {
      const res = await fetch(`${API_BASE}/accounts/payments/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete payment entry');
      void loadData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleSaveCustomer = async (e: FormEvent<HTMLFormElement>) => {
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
      void loadData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleSaveSupplier = async (e: FormEvent<HTMLFormElement>) => {
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
      void loadData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleSaveItem = async (e: FormEvent<HTMLFormElement>) => {
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
      void loadData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const buildLines = (lines: LineForm[]) =>
    lines.map(l => {
      const quantity = parseFloat(l.quantity) || 0;
      const isFoc = Boolean(l.is_foc);
      const rate = isFoc ? 0 : (parseFloat(l.rate) || 0);
      const discPct = isFoc ? 0 : (parseFloat(l.discount_percentage || '0') || 0);
      const base = quantity * rate;
      const discAmt = (base * discPct) / 100;
      const netAmount = Math.max(0, base - discAmt);

      return {
        item: parseInt(l.item_id, 10),
        quantity,
        rate,
        discount_percentage: discPct,
        discount_amount: parseFloat(discAmt.toFixed(2)),
        is_foc: isFoc,
        amount: parseFloat(netAmount.toFixed(2))
      };
    });

  const validateLines = (lines: LineForm[]): boolean => {
    const invalid = lines.some(l => !l.item_id || !(parseFloat(l.quantity) > 0) || !(parseFloat(l.rate) >= 0));
    if (invalid) { alert('Each line needs an item, a quantity above zero and a rate.'); return false; }
    return true;
  };

  const sumLines = (lines: LineForm[]) =>
    lines.reduce((sum, l) => {
      if (l.is_foc) return sum; // FOC હોય તો રકમ 0
      const qty = parseFloat(l.quantity) || 0;
      const rate = parseFloat(l.rate) || 0;
      const base = qty * rate;
      const discPct = parseFloat(l.discount_percentage || '0') || 0;
      const discAmt = (base * discPct) / 100;
      return sum + Math.max(0, base - discAmt);
    }, 0);

  const handleSaveJournalEntry = async (payload: JournalEntryPayload) => {
    const res = await fetch(`${API_BASE}/accounts/journal-entries/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save Journal Entry');
    }
    void loadData(); // Ledgers અને balances તરત રીફ્રેશ થશે
  };

  const handleSaveInvoice = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!invoiceForm.customer_id || invoiceForm.lines.length === 0) {
      alert('Please select a customer and add at least one item.');
      return;
    }

    // 1. એડિટ વખતે જૂના ઇન્વોઇસની ક્વોન્ટિટી મેપ કરો
    const existingQtyMap: Record<number, number> = {};
    if (editingId) {
      const currentInvoice = invoices.find((inv: any) => inv.id === editingId);
      if (currentInvoice && currentInvoice.items) {
        for (const itm of currentInvoice.items) {
          const itmId = typeof itm.item === 'object' ? (itm.item as any).id : itm.item;
          existingQtyMap[itmId] = (existingQtyMap[itmId] || 0) + parseFloat(itm.quantity.toString());
        }
      }
    }

    // 2. એક જ આઇટમ મલ્ટિપલ લાઇન્સમાં હોય તો સરવાળો (Aggregate) કરો
    const requestedQtyMap: Record<number, number> = {};
    for (const line of invoiceForm.lines) {
      if (!line.item_id) {
        alert('Please select an item for all line rows.');
        return;
      }
      const itemId = parseInt(line.item_id, 10);
      const qty = parseFloat(line.quantity) || 0;
      if (qty <= 0) {
        alert('Quantity must be greater than 0.');
        return;
      }
      requestedQtyMap[itemId] = (requestedQtyMap[itemId] || 0) + qty;
    }

    // 3. ઓવરસેલ ગાર્ડ ચેક: (Available Stock + Existing Invoiced Qty)
    for (const [itemIdStr, totalRequestedQty] of Object.entries(requestedQtyMap)) {
      const itemId = parseInt(itemIdStr, 10);
      const masterItem = items.find((i: any) => i.id === itemId);
      const currentStock = masterItem ? parseFloat(masterItem.current_stock?.toString() || '0') : 0;
      const alreadyInThisInvoice = existingQtyMap[itemId] || 0;
      const effectiveAvailableStock = currentStock + alreadyInThisInvoice;

      if (totalRequestedQty > effectiveAvailableStock) {
        alert(
          `Insufficient Stock for "${masterItem?.item_name || 'Item'}". ` +
          `Available: ${effectiveAvailableStock}, Requested Total: ${totalRequestedQty}`
        );
        return;
      }
    }

    // Customer Name મેળવો
    const selectedCustomer = customers.find((c: any) => c.id.toString() === invoiceForm.customer_id.toString());
    const customerName = selectedCustomer ? selectedCustomer.customer_name : '';

    const lineItems = buildLines(invoiceForm.lines);
    const net = sumLines(invoiceForm.lines);
    const taxRate = parseFloat(invoiceForm.tax_rate) || 0;
    const tax = (net * taxRate) / 100;
    const grand = net + tax;

    // 4. API Request
    const payload = {
      invoice_number: invoiceForm.invoice_number,
      customer: parseInt(invoiceForm.customer_id, 10),
      customer_name: customerName,
      posting_date: invoiceForm.posting_date,
      due_date: invoiceForm.due_date,
      tax_rate: taxRate.toFixed(2),
      net_total: net.toFixed(2),
      tax_amount: tax.toFixed(2),
      grand_total: grand.toFixed(2),
      status: invoiceForm.status || 'Submitted',
      items: lineItems
    };

    try {
      const url = editingId 
        ? `${API_BASE}/selling/invoices/${editingId}/` 
        : `${API_BASE}/selling/invoices/`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(errData));
      }

      setShowInvoiceModal(false);
      setEditingId(null);
      void loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  const handleSavePurchase = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const selSupp = suppliers.find(s => s.id === parseInt(purchaseForm.supplier_id, 10));
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
          bill_number: purchaseForm.bill_number, 
          supplier: selSupp.id, 
          supplier_name: selSupp.supplier_name,
          posting_date: purchaseForm.posting_date, 
          due_date: purchaseForm.due_date, // <--- aa line add karo
          net_total: net.toFixed(2), 
          tax_amount: tax.toFixed(2), 
          grand_total: (net + tax).toFixed(2),
          status: purchaseForm.status, 
          items: lineItems
        })
      });
      if (!res.ok) throw new Error('Failed to save purchase bill');
      setShowPurchaseModal(false);
      setEditingId(null);
      void loadData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleSavePayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.paid_amount);
    if (!paymentForm.party_name || !amount || amount <= 0) { alert('Enter valid party and amount'); return; }
    const partyType = paymentForm.payment_type === 'Receive' ? 'Customer' : 'Supplier';
    try {
      const url = editingId ? `${API_BASE}/accounts/payments/${editingId}/` : `${API_BASE}/accounts/payments/`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentForm, party_type: partyType, paid_amount: amount.toFixed(2) })
      });
      if (!res.ok) throw new Error('Payment failed');
      setShowPaymentModal(false);
      setEditingId(null);
      void loadData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const allPartyNames = Array.from(new Set([
    ...customers.map(c => c.customer_name),
    ...suppliers.map(s => s.supplier_name)
  ]));

  const totalDebit = glEntries.reduce((sum, r) => sum + Number(r.debit), 0);
  const totalCredit = glEntries.reduce((sum, r) => sum + Number(r.credit), 0);
  const closingBalance = glEntries.length > 0 ? glEntries[glEntries.length - 1].balance : 0;

  const invoiceNet = sumLines(invoiceForm.lines);
  const invoiceTax = (invoiceNet * (parseFloat(invoiceForm.tax_rate) || 0)) / 100;
  const purchaseNet = sumLines(purchaseForm.lines);
  const purchaseTax = (purchaseNet * (parseFloat(purchaseForm.tax_rate) || 0)) / 100;
  const salesStatusMap = getSalesPaymentStatusMap(invoices, payments);
  const purchaseStatusMap = getPurchasePaymentStatusMap(purchases, payments);
  void purchaseStatusMap;
  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPurchases = purchases.filter(pur =>
    pur.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pur.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredItems = items.filter(it =>
    it.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    it.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    it.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <button onClick={() => setActiveTab('ReturnsTab')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'ReturnsTab' ? '#1e293b' : 'transparent', color: activeTab === 'ReturnsTab' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <CreditCard size={18} /> Credit & Debit Notes
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
          <button onClick={() => setActiveTab('gst')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: activeTab === 'gst' ? '#1e293b' : 'transparent', color: activeTab === 'gst' ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
            <PieChart size={18} /> GST Returns (GSTR-1/3B)
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0, padding: '36px 40px', overflowY: 'auto' }}>
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
              onClick={() => void loadData()}
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
          <SellingTab
            invoices={invoices}
            filteredInvoices={filteredInvoices}
            customers={customers}
            salesStatusMap={salesStatusMap}
            dashboardSummary={dashboardSummary}
            gstData={gstData}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setEditingId={setEditingId}
            setInvoiceForm={setInvoiceForm}
            setShowInvoiceModal={setShowInvoiceModal}
            setSelectedInvoiceForPrint={setSelectedInvoiceForPrint}
            handleDeleteInvoice={handleDeleteInvoice}
          />
        )}

        {/* TAB 2: BUYING */}
        {activeTab === 'buying' && (
          <BuyingTab
            purchases={purchases}
            filteredPurchases={filteredPurchases}
            purchaseStatusMap={purchaseStatusMap}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setEditingId={setEditingId}
            setPurchaseForm={setPurchaseForm}
            setShowPurchaseModal={setShowPurchaseModal}
            setSelectedPurchaseForPrint={setSelectedPurchaseForPrint}
            handleDeletePurchase={handleDeletePurchase}
          />
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === 'customers' && (
          <CustomersTab
            customers={customers}
            partyOutstanding={partyOutstanding}
            setEditingId={setEditingId}
            setCustomerForm={setCustomerForm}
            setShowCustomerModal={setShowCustomerModal}
          />
        )}

        {/* TAB 4: SUPPLIERS */}
        {activeTab === 'suppliers' && (
          <SuppliersTab
            suppliers={suppliers}
            partyOutstanding={partyOutstanding}
            setEditingId={setEditingId}
            setSupplierForm={setSupplierForm}
            setShowSupplierModal={setShowSupplierModal}
          />
        )}

        {/* TAB 5: PAYMENTS */}
        {activeTab === 'payments' && (
          <PaymentsTab
            payments={payments}
            setPaymentForm={setPaymentForm}
            setShowPaymentModal={setShowPaymentModal}
            setSelectedPaymentForPrint={setSelectedPaymentForPrint}
            handleDeletePayment={handleDeletePayment}
            onOpenReconciliation={() => setShowReconciliationModal(true)}
            setEditingId={setEditingId} // <-- aa pass kari do
          />
        )}

        {/* TAB 6: STOCK */}
        {activeTab === 'stock' && (
          <StockTab
            items={items}
            filteredItems={filteredItems}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setEditingId={setEditingId}
            setItemForm={setItemForm}
            setShowItemModal={setShowItemModal}
          />
        )}

        {/* TAB 7: STOCK MOVEMENT LEDGER */}
        {activeTab === 'stock-ledger' && (
          <StockLedgerTab
            stockLedger={stockLedger}
            items={items}
            stockItemFilter={stockItemFilter}
            setStockItemFilter={setStockItemFilter}
          />
        )}

        {/* TAB 8: GL WITH FILTERS */}
        {activeTab === 'accounts' && (
          <AccountsTab
            glEntries={glEntries}
            allPartyNames={allPartyNames}
            glAccountFilter={glAccountFilter}
            setGlAccountFilter={setGlAccountFilter}
            glPartyFilter={glPartyFilter}
            setGlPartyFilter={setGlPartyFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            closingBalance={closingBalance}
            setShowLedgerPrintModal={setShowLedgerPrintModal}
            onNewJournalEntry={() => setShowJournalModal(true)}
          />
        )}

        {/* TAB 9: GST */}
        {activeTab === 'gst' && (
          <GSTTab
            gstData={gstData}
            setShowGSTPrintModal={setShowGstModal}
          />
        )}

        {/* TAB 10: REPORTS */}
        {activeTab === 'reports' && (
          <ReportsTab
            finance={finance}
            loading={loading}
            loadError={loadError}
            setShowFinancePrintModal={setShowFinancePrintModal}
            onDrillDown={(accountName: string) => {
              setGlAccountFilter(accountName);
              setActiveTab('accounts');
            }}
          />
        )}

        {/* TAB 11: RETURNS */}
        {activeTab === 'ReturnsTab' && <ReturnsTab />}
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

      <JournalEntryModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        onSave={handleSaveJournalEntry}
        allPartyNames={allPartyNames}
      />

      <PaymentReconciliationModal
        isOpen={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
        customers={customers}
        suppliers={suppliers}
        onReconciliationDone={() => void loadData()}
      />

      {/* Financial Statements Print Modal */}
      {showFinancePrintModal && finance && (
        <FinancialReportPrintModal finance={finance} onClose={() => setShowFinancePrintModal(false)} />
      )}

      {/* SUPPLIER MODAL */}
      {showSupplierModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                {editingId ? 'Edit Supplier' : 'New Supplier'}
              </h2>
              <button
                onClick={() => setShowSupplierModal(false)}
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Supplier Name */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Supplier / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.supplier_name}
                  onChange={e => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })}
                  placeholder="e.g. Patel & Sons LLP / Amazon India"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Supplier Type & GST Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Supplier Type</label>
                  <select
                    value={supplierForm.supplier_type}
                    onChange={e => setSupplierForm({ ...supplierForm, supplier_type: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="Company">Company (B2B)</option>
                    <option value="Individual">Individual / Proprietor</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>GST Category</label>
                  <select
                    value={supplierForm.gst_category}
                    onChange={e => {
                      const cat = e.target.value;
                      setSupplierForm({
                        ...supplierForm,
                        gst_category: cat as any,
                        gstin: cat === 'Unregistered' ? '' : supplierForm.gstin
                      });
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="Registered Regular">Registered Regular</option>
                    <option value="Registered Composition">Registered Composition</option>
                    <option value="Unregistered">Unregistered</option>
                  </select>
                </div>
              </div>

              {/* GSTIN */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                  GSTIN <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>(Unregistered હોય તો ખાલી રાખો)</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={supplierForm.gstin || ''}
                  onChange={e => {
                    const val = e.target.value.toUpperCase();
                    setSupplierForm({
                      ...supplierForm,
                      gstin: val,
                      gst_category: val.length > 0 ? 'Registered Regular' : supplierForm.gst_category
                    });
                  }}
                  placeholder="24AAAAA0000A1Z5"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Mobile & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Mobile Number</label>
                  <input
                    type="text"
                    value={supplierForm.mobile_no || ''}
                    onChange={e => setSupplierForm({ ...supplierForm, mobile_no: e.target.value })}
                    placeholder="9876543210"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Email ID</label>
                  <input
                    type="email"
                    value={supplierForm.email || ''}
                    onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="vendor@example.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* City & Postal Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>City</label>
                  <input
                    type="text"
                    value={supplierForm.city || ''}
                    onChange={e => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    placeholder="Mumbai / Ahmedabad"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Pincode / Postal Code</label>
                  <input
                    type="text"
                    value={supplierForm.postal_code || ''}
                    onChange={e => setSupplierForm({ ...supplierForm, postal_code: e.target.value })}
                    placeholder="400001"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                  Address (Street / Building / Area)
                </label>
                <textarea
                  rows={2}
                  value={supplierForm.address || ''}
                  onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="e.g. 101, Industrial Estate, Ring Road"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    marginTop: '4px',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  {editingId ? 'Update Supplier' : 'Save Supplier'}
                </button>
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
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Due Date</label><input type="date" required style={fieldStyle} value={purchaseForm.due_date} onChange={e => setPurchaseForm({ ...purchaseForm, due_date: e.target.value })} /></div>
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

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                {editingId ? 'Edit Customer' : 'New Customer'}
              </h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Customer Name */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerForm.customer_name}
                  onChange={e => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                  placeholder="e.g. Ramesh Patel / ABC Enterprises"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Customer Type & GST Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Customer Type</label>
                  <select
                    value={customerForm.customer_type}
                    onChange={e => setCustomerForm({ ...customerForm, customer_type: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="Individual">Individual (B2C / Retail)</option>
                    <option value="Company">Company (B2B)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>GST Category</label>
                  <select
                    value={customerForm.gst_category}
                    onChange={e => {
                      const cat = e.target.value;
                      setCustomerForm({
                        ...customerForm,
                        gst_category: cat as any,
                        gstin: cat === 'Unregistered' ? '' : customerForm.gstin
                      });
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="Unregistered">Unregistered</option>
                    <option value="Registered Regular">Registered Regular</option>
                    <option value="Registered Composition">Registered Composition</option>
                  </select>
                </div>
              </div>

              {/* GSTIN (Optional) */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                  GSTIN <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>(Optional - B2C હોય તો ખાલી રાખો)</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={customerForm.gstin || ''}
                  onChange={e => {
                    const val = e.target.value.toUpperCase();
                    setCustomerForm({
                      ...customerForm,
                      gstin: val,
                      gst_category: val.length > 0 ? 'Registered Regular' : customerForm.gst_category
                    });
                  }}
                  placeholder="24AAAAA0000A1Z5"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Mobile & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Mobile Number</label>
                  <input
                    type="text"
                    value={customerForm.mobile_no || ''}
                    onChange={e => setCustomerForm({ ...customerForm, mobile_no: e.target.value })}
                    placeholder="9876543210"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Email ID</label>
                  <input
                    type="email"
                    value={customerForm.email || ''}
                    onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })}
                    placeholder="customer@example.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* City & Postal Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>City</label>
                  <input
                    type="text"
                    value={customerForm.city || ''}
                    onChange={e => setCustomerForm({ ...customerForm, city: e.target.value })}
                    placeholder="Ahmedabad"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Pincode / Postal Code</label>
                  <input
                    type="text"
                    value={customerForm.postal_code || ''}
                    onChange={e => setCustomerForm({ ...customerForm, postal_code: e.target.value })}
                    placeholder="380001"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                  Address (Street / Building / Area)
                </label>
                <textarea
                  rows={2}
                  value={customerForm.address || ''}
                  onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="e.g. 402, Shivalik Business Center, SG Highway"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    marginTop: '4px',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                >
                  {editingId ? 'Update Customer' : 'Save Customer'}
                </button>
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
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Rate (Rs.)</label><input type="number" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={itemForm.standard_rate} onChange={e => setItemForm({ ...itemForm, standard_rate: e.target.value })} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Stock (Ledger Synced)</label><input type="number" readOnly disabled style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: '#f1f5f9', color: '#64748b' }} value={itemForm.current_stock} /></div>
              </div>
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
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: '600' }}>Due Date</label><input type="date" required style={fieldStyle} value={invoiceForm.due_date} onChange={e => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} /></div>
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
              <h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Edit Payment Entry' : 'Payment Entry'}</h3>
              <button onClick={() => { setShowPaymentModal(false); setEditingId(null); }} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '600' }}>Payment Type</label>
                  <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.payment_type} onChange={e => {
                    const type = e.target.value as 'Receive' | 'Pay';
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
                  <select style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} value={paymentForm.mode_of_payment} onChange={e => setPaymentForm({ ...paymentForm, mode_of_payment: e.target.value as 'Bank' | 'Cash' | 'Cheque' })}>
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

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>Reference / UTR / Cheque No</label>
                <input
                  placeholder="e.g. UPI-123456789 or CHQ-00123"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }}
                  value={paymentForm.reference_no || ''}
                  onChange={e => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                />
              </div>

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
                <button type="button" onClick={() => { setShowPaymentModal(false); setEditingId(null); }} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
                  {editingId ? 'Update Payment' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showGstModal && (
        <GSTPrintModal data={gstData} onClose={() => setShowGstModal(false)} />
      )}
    </div>
  );
}