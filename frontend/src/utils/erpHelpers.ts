import type { CSSProperties } from 'react';
import type { SalesInvoice, PurchaseInvoice, PaymentEntry } from '../types/erp';

export const API_BASE = 'http://127.0.0.1:8000/api';

export type DashboardSummary = { total_sales: number; total_purchases: number; bank_balance: number };

export const GST_SLABS = ['0', '5', '12', '18', '28'];

export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return String(err);
};

export const nextSequenceNumber = (prefix: string, existing: (string | undefined)[]): string => {
  const highest = existing.reduce((max, value) => {
    const match = /^([A-Za-z-]*)(\d+)$/.exec(value ?? '');
    return match ? Math.max(max, parseInt(match[2], 10)) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
};

export const getNextInvoiceNumber = (list: SalesInvoice[]) => nextSequenceNumber('INV-', list.map(i => i.invoice_number));
export const getNextPurchaseNumber = (list: PurchaseInvoice[]) => nextSequenceNumber('PUR-', list.map(p => p.bill_number));
export const getNextPaymentNumber = (list: PaymentEntry[]) => nextSequenceNumber('PAY-', list.map(p => p.voucher_no));

export const inferTaxRate = (netTotal: number | string, taxAmount: number | string): string => {
  const net = parseFloat(String(netTotal)) || 0;
  const tax = parseFloat(String(taxAmount)) || 0;
  if (net <= 0) return '0';
  const rate = (tax / net) * 100;
  return GST_SLABS.reduce((best, slab) =>
    Math.abs(Number(slab) - rate) < Math.abs(Number(best) - rate) ? slab : best
  );
};

export interface LineForm {
  uid: string;
  item_id: string;
  quantity: string;
  rate: string;
}

let lineCounter = 0;

export const newLine = (): LineForm => ({ uid: `l${++lineCounter}`, item_id: '', quantity: '1', rate: '0' });

export const lineFromItem = (item: { item: number; quantity: number | string; rate: number | string }): LineForm => ({
  uid: `l${++lineCounter}`,
  item_id: String(item.item),
  quantity: String(item.quantity),
  rate: String(item.rate)
});

export const fieldStyle: CSSProperties = {
  width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box'
};

// Due Date & Overdue Calculation Helper
export const getDueStatus = (postingDate: string, dueDate?: string | null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let targetDate: Date;
  if (dueDate) {
    targetDate = new Date(dueDate);
  } else {
    // Default 30 days credit period
    targetDate = new Date(postingDate);
    targetDate.setDate(targetDate.getDate() + 30);
  }
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const formattedDueDate = targetDate.toISOString().split('T')[0];

  if (diffDays > 0) {
    return { isOverdue: true, days: diffDays, text: `Overdue by ${diffDays}d`, dueDate: formattedDueDate };
  } else if (diffDays === 0) {
    return { isOverdue: false, days: 0, text: 'Due today', dueDate: formattedDueDate };
  } else {
    return { isOverdue: false, days: Math.abs(diffDays), text: `Due in ${Math.abs(diffDays)}d`, dueDate: formattedDueDate };
  }
};

// Sales Invoices Dynamic FIFO Payment Status Helper
export const getSalesPaymentStatusMap = (
  invoices: SalesInvoice[],
  payments: PaymentEntry[]
) => {
  const sorted = [...invoices].sort((a, b) => {
    if (a.posting_date !== b.posting_date) return a.posting_date.localeCompare(b.posting_date);
    return (a.id || 0) - (b.id || 0);
  });

  const pool: Record<string, number> = {};
  for (const p of payments) {
    if (p.payment_type === 'Receive') {
      const name = p.party_name;
      pool[name] = (pool[name] || 0) + (parseFloat(String(p.paid_amount)) || 0);
    }
  }

  const map: Record<number, { status: 'Paid' | 'Partially Paid' | 'Unpaid'; paid: number; balance: number }> = {};
  for (const inv of sorted) {
    if (!inv.id) continue;
    const name = inv.customer_name;
    const total = parseFloat(String(inv.grand_total)) || 0;
    const avail = pool[name] || 0;

    if (avail >= total && total > 0) {
      map[inv.id] = { status: 'Paid', paid: total, balance: 0 };
      pool[name] -= total;
    } else if (avail > 0) {
      map[inv.id] = { status: 'Partially Paid', paid: avail, balance: total - avail };
      pool[name] = 0;
    } else {
      map[inv.id] = { status: 'Unpaid', paid: 0, balance: total };
    }
  }
  return map;
};

// Purchase Bills Dynamic FIFO Payment Status Helper
export const getPurchasePaymentStatusMap = (
  purchases: PurchaseInvoice[],
  payments: PaymentEntry[]
) => {
  const sorted = [...purchases].sort((a, b) => {
    if (a.posting_date !== b.posting_date) return a.posting_date.localeCompare(b.posting_date);
    return (a.id || 0) - (b.id || 0);
  });

  const pool: Record<string, number> = {};
  for (const p of payments) {
    if (p.payment_type === 'Pay') {
      const name = p.party_name;
      pool[name] = (pool[name] || 0) + (parseFloat(String(p.paid_amount)) || 0);
    }
  }

  const map: Record<number, { status: 'Paid' | 'Partially Paid' | 'Unpaid'; paid: number; balance: number }> = {};
  for (const pur of sorted) {
    if (!pur.id) continue;
    const name = pur.supplier_name;
    const total = parseFloat(String(pur.grand_total)) || 0;
    const avail = pool[name] || 0;

    if (avail >= total && total > 0) {
      map[pur.id] = { status: 'Paid', paid: total, balance: 0 };
      pool[name] -= total;
    } else if (avail > 0) {
      map[pur.id] = { status: 'Partially Paid', paid: avail, balance: total - avail };
      pool[name] = 0;
    } else {
      map[pur.id] = { status: 'Unpaid', paid: 0, balance: total };
    }
  }
  return map;
};

export const exportToCSV = (data: Record<string, any>[], filename: string) => {
  if (!data || data.length === 0) {
    alert('Export karva mate data nathi.');
    return;
  }
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};