import React, { useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import type { GLEntryRow } from '../types/erp';

interface LedgerPrintModalProps {
  entries: GLEntryRow[];
  accountFilter: string;
  partyFilter: string;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  onClose: () => void;
}

export const LedgerPrintModal: React.FC<LedgerPrintModalProps> = ({
  entries,
  accountFilter,
  partyFilter,
  totalDebit,
  totalCredit,
  closingBalance,
  onClose,
}) => {
  const partyLabel = partyFilter !== 'all' ? partyFilter : (accountFilter !== 'all' ? accountFilter : 'General_Ledger');
  const targetFileName = `Statement_${partyLabel.replace(/[^a-zA-Z0-9]/g, '_')}`;

  useEffect(() => {
    const originalTitle = document.title;
    document.title = targetFileName;
    return () => {
      document.title = originalTitle;
    };
  }, [targetFileName]);

  const handlePrint = () => {
    window.print();
  };

  // Chronological order for statement (oldest to newest)
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.posting_date !== b.posting_date) {
      return a.posting_date.localeCompare(b.posting_date);
    }
    return a.id - b.id;
  });

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
          #printable-ledger-statement, #printable-ledger-statement * {
            visibility: visible;
          }
          #printable-ledger-statement {
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
          width: '880px',
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
            Ledger Statement Preview - {partyLabel}
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

        {/* Printable Statement Sheet */}
        <div
          id="printable-ledger-statement"
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
              <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.05em', marginBottom: '6px' }}>
                STATEMENT OF ACCOUNTS
              </span>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
                <strong>Generated On:</strong> {new Date().toISOString().split('T')[0]}<br />
                <strong>Ledger:</strong> {accountFilter === 'all' ? 'Consolidated Ledger' : accountFilter}
              </p>
            </div>
          </div>

          {/* Party Banner */}
          <div style={{ margin: '18px 0', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 'bold' }}>
                Account / Party Name
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '17px', color: '#0f172a' }}>
                {partyFilter !== 'all' ? partyFilter : 'All Transacting Parties'}
              </h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>
                Closing Outstanding Balance
              </span>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: closingBalance >= 0 ? '#0f172a' : '#b91c1c' }}>
                Rs. {Math.abs(closingBalance).toFixed(2)} {closingBalance >= 0 ? 'Dr' : 'Cr'}
              </div>
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '80px' }}>Date</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Voucher Ref</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Account / Narration</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '90px' }}>Debit (Rs.)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '90px' }}>Credit (Rs.)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px' }}>Balance (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries && sortedEntries.length > 0 ? (
                sortedEntries.map((row, idx) => {
                  const bal = Number(row.balance);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 10px' }}>{row.posting_date}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <strong>{row.voucher_type}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>#{row.voucher_no}</div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <strong>{row.account}</strong>
                        {row.party && <div style={{ fontSize: '11px', color: '#64748b' }}>Party: {row.party}</div>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1', fontWeight: Number(row.debit) > 0 ? '600' : 'normal' }}>
                        {Number(row.debit) > 0 ? Number(row.debit).toFixed(2) : '-'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d', fontWeight: Number(row.credit) > 0 ? '600' : 'normal' }}>
                        {Number(row.credit) > 0 ? Number(row.credit).toFixed(2) : '-'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>
                        {Math.abs(bal).toFixed(2)} {bal >= 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '14px', textAlign: 'center', color: '#64748b' }}>
                    No ledger transactions found for this period.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ padding: '10px', textAlign: 'right' }}>Total Movements:</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#0369a1' }}>Rs. {totalDebit.toFixed(2)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#15803d' }}>Rs. {totalCredit.toFixed(2)}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: closingBalance >= 0 ? '#0f172a' : '#b91c1c' }}>
                  Rs. {Math.abs(closingBalance).toFixed(2)} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer Signature Box */}
          <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#64748b' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#334155' }}>Confirmation Note:</p>
              Please verify all entries against your records. Report any discrepancies within 7 days.
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 32px 0', fontWeight: 'bold', color: '#334155' }}>For, TallyBIZ Enterprise</p>
              <span style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', display: 'inline-block', width: '160px' }}>
                Authorised Signatory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};