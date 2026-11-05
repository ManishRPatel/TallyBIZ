import type { FC } from 'react';
import { Printer } from 'lucide-react';
import type { FinancialStatements } from '../../types/erp';

interface ReportsTabProps {
  finance: FinancialStatements | null;
  loading: boolean;
  loadError: string | null;
  setShowFinancePrintModal: (show: boolean) => void;
  onDrillDown?: (accountName: string) => void;
}

export const ReportsTab: FC<ReportsTabProps> = ({
  finance,
  loading,
  loadError,
  setShowFinancePrintModal,
  onDrillDown,
}) => {
  if (loading) return <div>Loading Financial Statements...</div>;
  if (loadError) return <div style={{ color: '#b91c1c' }}>{loadError}</div>;
  if (!finance) return <div>No data available.</div>;

  // ક્લિક કરવા માટેની હેલ્પર સ્ટાઇલ
  const clickableStyle = {
    cursor: onDrillDown ? 'pointer' : 'default',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Profit & Loss / Balance Sheet</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Real-time trial balance derived financial reports (Click on accounts to drill down)</p>
        </div>
        <button
          onClick={() => setShowFinancePrintModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          <Printer size={16} /> Print Statements
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* PROFIT & LOSS */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #0284c7', paddingBottom: '8px' }}>Income Statement (P&L)</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: '8px 0 4px 0', color: '#475569', fontSize: '14px' }}>INCOME</h4>
            <div
              style={clickableStyle}
              onClick={() => onDrillDown?.('Sales Income')}
              title="Click to view Sales Income Ledger"
            >
              <span style={{ color: '#0369a1', textDecoration: 'underline' }}>Sales Income</span>
              <strong>Rs. {finance.income.sales.toFixed(2)}</strong>
            </div>

            <h4 style={{ margin: '16px 0 4px 0', color: '#475569', fontSize: '14px' }}>EXPENSES / COGS</h4>
            <div
              style={clickableStyle}
              onClick={() => onDrillDown?.('Stock Received But Not Billed')}
              title="Click to view Purchases / Stock Ledger"
            >
              <span style={{ color: '#0369a1', textDecoration: 'underline' }}>Purchases (Cost of Goods)</span>
              <strong>Rs. {finance.expense.purchases.toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', marginTop: '16px', paddingTop: '12px', fontSize: '16px' }}>
              <strong>Gross & Net Profit</strong>
              <strong style={{ color: finance.profit.net_profit >= 0 ? '#15803d' : '#b91c1c' }}>
                Rs. {finance.profit.net_profit.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {/* BALANCE SHEET */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #0284c7', paddingBottom: '8px' }}>Balance Sheet</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: '8px 0 4px 0', color: '#475569', fontSize: '14px' }}>ASSETS</h4>
            <div
              style={clickableStyle}
              onClick={() => onDrillDown?.('Bank Account')}
              title="Click to view Bank Ledger"
            >
              <span style={{ color: '#0369a1', textDecoration: 'underline' }}>Bank & Cash Accounts</span>
              <strong>Rs. {finance.balance_sheet.assets.bank_cash.toFixed(2)}</strong>
            </div>
            <div
              style={clickableStyle}
              onClick={() => onDrillDown?.('Debtors')}
              title="Click to view Debtors Ledger"
            >
              <span style={{ color: '#0369a1', textDecoration: 'underline' }}>Debtors (Customer Receivables)</span>
              <strong>Rs. {finance.balance_sheet.assets.debtors_receivable.toFixed(2)}</strong>
            </div>

            {((finance.balance_sheet.assets as any).gst_credit > 0) && (
              <div
                style={clickableStyle}
                onClick={() => onDrillDown?.('Input GST')}
                title="Click to view Input GST / ITC Ledger"
              >
                <span style={{ color: '#0369a1', textDecoration: 'underline' }}>GST Input Credit (ITC Asset)</span>
                <strong style={{ color: '#15803d' }}>Rs. {(finance.balance_sheet.assets as any).gst_credit.toFixed(2)}</strong>
              </div>
            )}

            <h4 style={{ margin: '16px 0 4px 0', color: '#475569', fontSize: '14px' }}>LIABILITIES</h4>
            <div
              style={clickableStyle}
              onClick={() => onDrillDown?.('Creditors')}
              title="Click to view Creditors Ledger"
            >
              <span style={{ color: '#0369a1', textDecoration: 'underline' }}>Creditors (Supplier Payables)</span>
              <strong>Rs. {finance.balance_sheet.liabilities.creditors_payable.toFixed(2)}</strong>
            </div>
            {finance.balance_sheet.liabilities.gst_payable > 0 ? (
              <div
                style={clickableStyle}
                onClick={() => onDrillDown?.('Output GST')}
                title="Click to view GST Liability Ledger"
              >
                <span style={{ color: '#0369a1', textDecoration: 'underline' }}>GST Payable</span>
                <strong style={{ color: '#b91c1c' }}>Rs. {finance.balance_sheet.liabilities.gst_payable.toFixed(2)}</strong>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: '13px', color: '#64748b' }}>
                <span>GST Net Payable</span>
                <span>Rs. 0.00 (ITC Surplus)</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', marginTop: '16px', paddingTop: '12px', fontSize: '16px' }}>
              <strong>Total Assets / Liabilities</strong>
              <strong style={{ color: '#0f172a' }}>
                Rs. {finance.balance_sheet.assets.total_assets.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};