import React, { useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import type { PaymentEntry } from '../types/erp';

interface PaymentPrintModalProps {
  payment: PaymentEntry | null;
  onClose: () => void;
}

export const PaymentPrintModal: React.FC<PaymentPrintModalProps> = ({
  payment,
  onClose,
}) => {
  // Hooks must run unconditionally, so the effect is declared before the
  // null-guard below.
  const formattedParty = (payment?.party_name || 'Party').replace(/[^a-zA-Z0-9]/g, '_');
  const targetFileName = payment ? `Payment_${payment.voucher_no}_${formattedParty}` : '';

  useEffect(() => {
    const originalTitle = document.title;
    if (targetFileName) document.title = targetFileName;
    return () => {
      document.title = originalTitle;
    };
  }, [targetFileName]);

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const amount = parseFloat(payment.paid_amount.toString()) || 0;
  const isReceive = payment.payment_type === 'Receive';

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
          #printable-payment-voucher, #printable-payment-voucher * {
            visibility: visible;
          }
          #printable-payment-voucher {
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
          width: '780px',
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
            {isReceive ? 'Money Receipt' : 'Payment Voucher'} Preview - {payment.voucher_no}
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

        {/* Printable Voucher Sheet */}
        <div
          id="printable-payment-voucher"
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
                Email: accounts@tallybiz.com | Phone: +91 98765 43210
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: isReceive ? '#dcfce7' : '#fee2e2',
                  color: isReceive ? '#15803d' : '#b91c1c',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                {isReceive ? 'OFFICIAL RECEIPT' : 'PAYMENT VOUCHER'}
              </span>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                <strong>Voucher No:</strong> {payment.voucher_no}<br />
                <strong>Date:</strong> {payment.posting_date}
              </p>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ margin: '24px 0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', width: '220px', fontWeight: '600', color: '#64748b' }}>
                    {isReceive ? 'Received From:' : 'Paid To:'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
                    {payment.party_name} ({payment.party_type})
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#64748b' }}>Payment Mode:</td>
                  <td style={{ padding: '12px 16px', color: '#0f172a' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      {payment.mode_of_payment}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#64748b' }}>Reference / UTR No:</td>
                  <td style={{ padding: '12px 16px', color: '#0f172a' }}>
                    {payment.reference_no || 'N/A'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#64748b' }}>Narration / Remarks:</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {payment.remarks || (isReceive ? `Settlement received against customer outstanding ledger.` : `Vendor payment released via ${payment.mode_of_payment}.`)}
                  </td>
                </tr>
                <tr style={{ background: '#f0fdf4' }}>
                  <td style={{ padding: '16px', fontWeight: 'bold', fontSize: '15px', color: '#166534' }}>
                    Amount Transacted:
                  </td>
                  <td style={{ padding: '16px', fontWeight: 'bold', fontSize: '20px', color: isReceive ? '#15803d' : '#b91c1c' }}>
                    Rs. {amount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Double-entry Journal Mapping Preview */}
          <div style={{ margin: '20px 0', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '4px' }}>
              Accounting Impact (General Ledger):
            </span>
            {isReceive ? (
              <p style={{ margin: 0, color: '#475569' }}>
                Debit: <strong>Bank/Cash Account</strong> (Rs. {amount.toFixed(2)}) &nbsp;|&nbsp; Credit: <strong>Debtors - {payment.party_name}</strong> (Rs. {amount.toFixed(2)})
              </p>
            ) : (
              <p style={{ margin: 0, color: '#475569' }}>
                Debit: <strong>Creditors - {payment.party_name}</strong> (Rs. {amount.toFixed(2)}) &nbsp;|&nbsp; Credit: <strong>Bank/Cash Account</strong> (Rs. {amount.toFixed(2)})
              </p>
            )}
          </div>

          {/* Footer Signature Box */}
          <div style={{ marginTop: '50px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#64748b' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', display: 'inline-block', width: '160px' }}>
                Party / Receiver Signature
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 36px 0', fontWeight: 'bold', color: '#334155' }}>For, TallyBIZ Enterprise</p>
              <span style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', display: 'inline-block', width: '160px' }}>
                Authorised Cashier / Accountant
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};