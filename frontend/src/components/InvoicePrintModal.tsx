import React, { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import type { SalesInvoice, Customer, Item } from '../types/erp';
import html2pdf from 'html2pdf.js';

interface InvoicePrintModalProps {
  invoice: SalesInvoice | null;
  customer?: Customer;
  itemsMaster: Item[];
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  customer,
  itemsMaster,
  onClose,
}) => {
  const formattedParty = (invoice?.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const targetFileName = invoice ? `Invoice_${invoice.invoice_number}_${formattedParty}` : '';

  useEffect(() => {
    const originalTitle = document.title;
    if (targetFileName) document.title = targetFileName;
    return () => {
      document.title = originalTitle;
    };
  }, [targetFileName]);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-invoice');
    if (!element) return;

    const opt: any = {
      margin: [10, 10, 10, 10],
      filename: `${invoice.invoice_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    (html2pdf as any)().set(opt).from(element).save();
  };

  const netTotal = parseFloat(invoice.net_total.toString()) || 0;
  const taxTotal = parseFloat(invoice.tax_amount.toString()) || 0;
  const grandTotal = parseFloat(invoice.grand_total.toString()) || 0;
  const halfTax = taxTotal / 2;

  // Round Off / Adjustment: જો મોડેલમાં round_off હોય તો તે, નહીં તો Grand Total - (Net + Tax)
  const roundOff = (invoice as any).round_off !== undefined && (invoice as any).round_off !== null
    ? parseFloat((invoice as any).round_off.toString()) || 0
    : parseFloat((grandTotal - (netTotal + taxTotal)).toFixed(2));

  // Inter-State Check: જો GSTIN 24 સિવાયના રાજ્યનો હોય તો IGST ગણાય
  const isInterState = customer?.gstin && !customer.gstin.startsWith('24');

  // Customer Category Logic: જો અન-રજિસ્ટર્ડ હોય તો સાચું લેબલ બતાવવું
  const customerGstCategory = customer?.gst_category 
    ? customer.gst_category 
    : (customer?.gstin && customer.gstin.trim() !== '' ? 'Registered Regular' : 'Unregistered');

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
          margin: 10mm; /* Browser default headers & footers will be removed */
        }
        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
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
        {/* Controls Header (Print / Close Buttons) */}
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
            Tax Invoice Preview - {invoice.invoice_number}
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

        {/* Invoice Printable Sheet */}
        <div
          id="printable-invoice"
          style={{
            padding: '30px 36px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#0f172a',
            boxSizing: 'border-box',
            width: '100%',
            background: '#fff',
          }}
        >
          {/* 1. Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0284c7', paddingBottom: '16px' }}>
            <div style={{ maxWidth: '60%' }}>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 'bold', color: '#0284c7' }}>
                TallyBIZ ENTERPRISE
              </h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                SG Highway, Ahmedabad, Gujarat - 380054<br />
                GSTIN: <strong>24ABCDE1234F1Z5</strong> | State: Gujarat (24)<br />
                Email: accounts@tallybiz.com | Phone: +91 98765 43210
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.05em', marginBottom: '6px' }}>
                TAX INVOICE
              </span>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                <strong>Invoice No:</strong> {invoice.invoice_number}<br />
                <strong>Date:</strong> {invoice.posting_date}
              </p>
            </div>
          </div>

          {/* 2. Customer / Billed To Section */}
          <div style={{ margin: '18px 0', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 'bold' }}>
              Billed To (Customer Details)
            </span>
            <h3 style={{ margin: '4px 0 2px 0', fontSize: '16px', color: '#0f172a' }}>
              {invoice.customer_name}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
              {customer?.address && <>{customer.address}<br /></>}
              {[customer?.city, customer?.postal_code].filter(Boolean).join(' - ') || 'Address Not Provided'}<br />
              <strong>GSTIN:</strong> {customer?.gstin || 'Unregistered'} | <strong>Category:</strong> {customerGstCategory}
            </p>
          </div>

          {/* 3. Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '30px' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item Description</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '70px' }}>Qty</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '90px' }}>Rate (Rs.)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '120px' }}>Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((itemRow, idx) => {
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
                  <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No items listed</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 4. Single Clean Tax Breakdown & Grand Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Taxable Value (Net):</span>
                <span>Rs. {netTotal.toFixed(2)}</span>
              </div>
              {isInterState ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>IGST (18.00%):</span>
                  <span>Rs. {taxTotal.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>CGST (9.00%):</span>
                    <span>Rs. {halfTax.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>SGST (9.00%):</span>
                    <span>Rs. {halfTax.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontWeight: 'bold' }}>
                <span>Total GST (18.00%):</span>
                <span>Rs. {taxTotal.toFixed(2)}</span>
              </div>

              {/* Round Off / Adjustment row */}
              {Math.abs(roundOff) > 0.001 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '12px' }}>
                  <span>Round Off / Adjustment:</span>
                  <span>{roundOff > 0 ? `+Rs. ${roundOff.toFixed(2)}` : `-Rs. ${Math.abs(roundOff).toFixed(2)}`}</span>
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '2px solid #0284c7', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                <span>Grand Total:</span>
                <span style={{ color: '#0284c7' }}>Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 5. Footer Terms & Sign */}
          <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#64748b' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#334155' }}>Terms & Conditions:</p>
              1. Goods once sold will not be taken back.<br />
              2. Interest @18% p.a. will be charged if payment is delayed.<br />
              3. Subject to Ahmedabad jurisdiction only.
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 32px 0', fontWeight: 'bold', color: '#334155' }}>For, TallyBIZ Enterprise</p>
              <span style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', display: 'inline-block', width: '150px' }}>
                Authorised Signatory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};