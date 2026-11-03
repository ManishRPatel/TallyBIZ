import React, { useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import type { FinancialStatements } from '../types/erp';

interface FinancialReportPrintModalProps {
  finance: FinancialStatements | null;
  onClose: () => void;
}

export const FinancialReportPrintModal: React.FC<FinancialReportPrintModalProps> = ({
  finance,
  onClose,
}) => {
  // Hooks must run unconditionally, so the effect is declared before the
  // null-guard below.
  const targetFileName = `Financial_Statements_${new Date().toISOString().split('T')[0]}`;

  useEffect(() => {
    const originalTitle = document.title;
    document.title = targetFileName;
    return () => {
      document.title = originalTitle;
    };
  }, [targetFileName]);

  if (!finance) return null;

  const handlePrint = () => {
    window.print();
  };

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
          #printable-financial-statements, #printable-financial-statements * {
            visibility: visible;
          }
          #printable-financial-statements {
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
            Financial Statements (Audit Preview)
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

        {/* Printable Content */}
        <div
          id="printable-financial-statements"
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
            <div>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 'bold', color: '#0284c7' }}>
                TallyBIZ ENTERPRISE
              </h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                SG Highway, Ahmedabad, Gujarat - 380054<br />
                GSTIN: <strong>24ABCDE1234F1Z5</strong> | State: Gujarat (24)
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.05em', marginBottom: '6px' }}>
                AUDITED FINANCIAL REPORT
              </span>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>
                <strong>As of Date:</strong> {new Date().toISOString().split('T')[0]}
              </p>
            </div>
          </div>

          {/* Section 1: Profit & Loss Statement */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', color: '#0369a1', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
              Statement of Profit & Loss
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0' }}>Revenue from Sales (Net Sales Turnover)</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>Rs. {finance.income.sales.toFixed(2)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', color: '#b91c1c' }}>Less: Cost of Goods Procured (Net Purchases)</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', color: '#b91c1c', fontWeight: '600' }}>- Rs. {finance.expense.purchases.toFixed(2)}</td>
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>
                  <td style={{ padding: '10px 0' }}>Gross Operating Profit / (Loss)</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: finance.profit.gross_profit >= 0 ? '#15803d' : '#b91c1c' }}>
                    Rs. {finance.profit.gross_profit.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: GST Tax Settlement */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', color: '#0369a1', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
              GST Statutory Tax Settlement (ITC Reconciliation)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0' }}>Output GST Collected (Tax Liability on Sales)</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '600' }}>Rs. {finance.gst.output_liability.toFixed(2)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 0', color: '#15803d' }}>Less: Input Tax Credit Available (GST Paid on Purchases)</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', color: '#15803d', fontWeight: '600' }}>- Rs. {finance.gst.input_itc.toFixed(2)}</td>
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>
                  <td style={{ padding: '10px 0' }}>{finance.gst.net_payable > 0 ? 'Net GST Payable to Government' : 'Eligible ITC Refund / Carry Forward'}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: finance.gst.net_payable > 0 ? '#b91c1c' : '#0284c7' }}>
                    Rs. {Math.abs(finance.gst.net_payable).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Balance Sheet */}
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ fontSize: '15px', color: '#0369a1', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
              Balance Sheet (Financial Position)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Current Assets</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                  <span>Bank & Cash Balances:</span><strong>Rs. {finance.balance_sheet.assets.bank_cash.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                  <span>Sundry Debtors (Receivables):</span><strong>Rs. {finance.balance_sheet.assets.debtors_receivable.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', fontSize: '14px', color: '#0369a1' }}>
                  <span>Total Assets:</span><span>Rs. {finance.balance_sheet.assets.total_assets.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>Current Liabilities</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                  <span>Sundry Creditors (Payables):</span><strong>Rs. {finance.balance_sheet.liabilities.creditors_payable.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                  <span>GST Tax Payable:</span><strong>Rs. {finance.balance_sheet.liabilities.gst_payable.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', fontSize: '14px', color: '#b91c1c' }}>
                  <span>Total Liabilities:</span><span>Rs. {finance.balance_sheet.liabilities.total_liabilities.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div style={{ marginTop: '50px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#64748b' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', display: 'inline-block', width: '160px' }}>
                Internal Auditor / CA
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 32px 0', fontWeight: 'bold', color: '#334155' }}>For, TallyBIZ Enterprise</p>
              <span style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', display: 'inline-block', width: '160px' }}>
                Managing Director / Partner
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};