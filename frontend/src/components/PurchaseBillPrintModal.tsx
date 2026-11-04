import React, { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import type { PurchaseInvoice, Supplier, Item } from '../types/erp';
import html2pdf from 'html2pdf.js';

interface PurchaseBillPrintModalProps {
  bill: PurchaseInvoice | null;
  supplier?: Supplier;
  itemsMaster: Item[];
  onClose: () => void;
}

export const PurchaseBillPrintModal: React.FC<PurchaseBillPrintModalProps> = ({
  bill,
  supplier,
  itemsMaster,
  onClose,
}) => {
  // Hooks must run unconditionally, so the effect is declared before the
  // null-guard below.
  const formattedParty = (bill?.supplier_name || 'Supplier').replace(/[^a-zA-Z0-9]/g, '_');
  const targetFileName = bill ? `PurchaseBill_${bill.bill_number}_${formattedParty}` : '';

  useEffect(() => {
    const originalTitle = document.title;
    if (targetFileName) document.title = targetFileName;
    return () => {
      document.title = originalTitle;
    };
  }, [targetFileName]);

  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-purchase-bill');
    if (!element) return;

    const opt: any = {
      margin: [10, 10, 10, 10],
      filename: `${bill.bill_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    (html2pdf as any)().set(opt).from(element).save();
  };

  const netTotal = parseFloat(bill.net_total.toString()) || 0;
  const taxTotal = parseFloat(bill.tax_amount.toString()) || 0;
  const grandTotal = parseFloat(bill.grand_total.toString()) || 0;
  const halfTax = taxTotal / 2;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        overflowY: 'auto',
        padding: '20px',
      }}
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-purchase-bill, #printable-purchase-bill * {
            visibility: visible;
          }
          #printable-purchase-bill {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '850px',
          maxWidth: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
      >
        {/* Controls Header */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontWeight: '600', color: '#334155', fontSize: '16px' }}>
            Purchase Bill Preview - {bill.bill_number}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <Printer size={16} /> Print / Save PDF
            </button>

<button
              onClick={handleDownloadPDF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              <Download size={15} /> Download PDF
            </button>

            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {/* Printable Purchase Sheet */}
        <div
          id="printable-purchase-bill"
          style={{
            padding: '30px 36px',
            overflowY: 'auto',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#0f172a',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0284c7', paddingBottom: '16px' }}>
            <div style={{ maxWidth: '60%' }}>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 'bold', color: '#0284c7' }}>
                TallyBIZ ENTERPRISE
              </h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                SG Highway, Ahmedabad, Gujarat - 380054<br />
                GSTIN: <strong>24ABCDE1234F1Z5</strong> | State: Gujarat (24)<br />
                Recipient Branch: Central Warehouse
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-block', background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.05em', marginBottom: '6px' }}>
                PURCHASE VOUCHER
              </span>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                <strong>Bill Ref #:</strong> {bill.bill_number}<br />
                <strong>Posting Date:</strong> {bill.posting_date}
              </p>
            </div>
          </div>

          {/* Supplier Details */}
          <div style={{ margin: '18px 0', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 'bold' }}>
              Supplier / Vendor (Inward From)
            </span>
            <h3 style={{ margin: '4px 0 2px 0', fontSize: '16px', color: '#0f172a' }}>
              {bill.supplier_name}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
              {supplier?.city ? `${supplier.city}, Gujarat` : 'Vendor Address Registered'}<br />
              <strong>GSTIN:</strong> {supplier?.gstin || 'Unregistered'} | <strong>Category:</strong> {supplier?.gst_category || 'Regular Registered'}
            </p>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '30px' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item Inward Description</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '70px' }}>Inward Qty</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '90px' }}>Cost (Rs.)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '120px' }}>Net Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {bill.items && bill.items.length > 0 ? (
                bill.items.map((itemRow, idx) => {
                  const masterItem = itemsMaster.find(m => m.id === itemRow.item);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 10px' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <strong>{masterItem ? masterItem.item_name : `Item #${itemRow.item}`}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Code: {masterItem?.item_code || '-'} | Unit: {masterItem?.unit || 'Nos'}</div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{itemRow.quantity}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>Rs. {parseFloat(itemRow.rate.toString()).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>Rs. {parseFloat(itemRow.amount.toString()).toFixed(2)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No items found</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Tax Breakdown & Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Subtotal (Net Purchases):</span>
                <span>Rs. {netTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Input CGST ITC (9.00%):</span>
                <span>Rs. {halfTax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Input SGST ITC (9.00%):</span>
                <span>Rs. {halfTax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 'bold' }}>
                <span>Total Input Tax Credit:</span>
                <span>Rs. {taxTotal.toFixed(2)}</span>
              </div>
              <hr style={{ border: 'none', borderTop: '2px solid #0284c7', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                <span>Total Amount Payable:</span>
                <span style={{ color: '#0284c7' }}>Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#64748b' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#334155' }}>Internal Verification Note:</p>
              1. Inventory goods inspected and accepted into warehouse stock.<br />
              2. Eligible for Input Tax Credit (ITC) under GST Section 16.<br />
              3. Voucher posted to Creditors & Inventory Ledgers.
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 32px 0', fontWeight: 'bold', color: '#334155' }}>Warehouse Manager / Accountant</p>
              <span style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', display: 'inline-block', width: '160px' }}>
                Verified & Passed By
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};