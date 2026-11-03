export interface Customer {
  id?: number;
  customer_name: string;
  customer_type: 'Company' | 'Individual';
  gst_category: 'Unregistered' | 'Registered Regular' | 'Registered Composition';
  gstin?: string;
  email?: string;
  mobile_no?: string;
  city?: string;
  postal_code?: string;
}

export interface Supplier {
  id?: number;
  supplier_name: string;
  supplier_type: 'Company' | 'Individual';
  gst_category: 'Unregistered' | 'Registered Regular' | 'Registered Composition';
  gstin?: string;
  email?: string;
  mobile_no?: string;
  city?: string;
  postal_code?: string;
}

export interface Item {
  id?: number;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
  standard_rate: number | string;
  current_stock: number | string;
}

export interface GLEntryRow {
  id: number;
  posting_date: string;
  account: string;
  party_type: string | null;
  party: string | null;
  voucher_type: string;
  voucher_no: string;
  against: string;
  remarks: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface SalesInvoiceItem {
  item: number;
  quantity: number;
  rate: number;
  amount: number;
}

export interface SalesInvoice {
  id?: number;
  invoice_number: string;
  customer?: number;
  customer_name: string;
  posting_date: string;
  net_total: number | string;
  tax_amount: number | string;
  grand_total: number | string;
  status: string;
  items: SalesInvoiceItem[];
}

export interface PurchaseInvoiceItem {
  item: number;
  quantity: number;
  rate: number;
  amount: number;
}

export interface PurchaseInvoice {
  id?: number;
  bill_number: string;
  supplier?: number;
  supplier_name: string;
  posting_date: string;
  net_total: number | string;
  tax_amount: number | string;
  grand_total: number | string;
  status: string;
  items: PurchaseInvoiceItem[];
}

export interface PaymentEntry {
  id?: number;
  voucher_no: string;
  payment_type: 'Receive' | 'Pay';
  posting_date: string;
  party_type: string;
  party_name: string;
  mode_of_payment: 'Bank' | 'Cash' | 'Cheque';
  paid_amount: number | string;
  reference_no?: string;
  remarks?: string;
}

export interface StockLedgerRow {
  id: number;
  posting_date: string;
  item_code: string;
  item_name: string;
  voucher_type: string;
  voucher_no: string;
  in_qty: number;
  out_qty: number;
  balance_qty: number;
  valuation_rate: number;
  balance_value: number;
}