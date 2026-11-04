import type { FC } from 'react';
import { Printer } from 'lucide-react';
import type { FinancialStatements } from '../../types/erp';

interface ReportsTabProps {
  finance: FinancialStatements | null;
  loading: boolean;
  loadError: string | null;
  setShowFinancePrintModal: (show: boolean) => void;
}

export const ReportsTab: FC<ReportsTabProps> = ({
  finance,
  loading,
  loadError,
  setShowFinancePrintModal,
}) => {
  if (!finance) {
    return (
      <div style={{ background: '#fff', padding: '48px 32px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          {loading
            ? 'Loading financial statements...'
            : loadError
              ? 'Financial statements could not be loaded. Check the banner above and retry.'
              : 'No financial statements available yet.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Financial Statements</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Real-time Profit & Loss and Balance Sheet derived from General Ledger</p>
        </div>
        <button
          onClick={() => setShowFinancePrintModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
        >
          <Printer size={16} /> Print Financial Statements
        </button>
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
  );
};