import type { FC } from 'react';
import { Printer, RefreshCw, Filter, Download } from 'lucide-react';
import { DataTable } from '../DataTable';
import type { GLEntryRow } from '../../types/erp';
import { exportToCSV } from '../../utils/erpHelpers';

interface AccountsTabProps {
  glEntries: GLEntryRow[];
  allPartyNames: string[];
  glAccountFilter: string;
  setGlAccountFilter: (filter: string) => void;
  glPartyFilter: string;
  setGlPartyFilter: (filter: string) => void;
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  setShowLedgerPrintModal: (show: boolean) => void;
  onNewJournalEntry: () => void;
}

export const AccountsTab: FC<AccountsTabProps> = ({
  glEntries,
  allPartyNames,
  glAccountFilter,
  setGlAccountFilter,
  glPartyFilter,
  setGlPartyFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  totalDebit,
  totalCredit,
  closingBalance,
  setShowLedgerPrintModal,
  onNewJournalEntry,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>General Ledger Entries</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Unified double-entry bookkeeping ledger & individual party statements</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowLedgerPrintModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            <Printer size={14} /> Print Statement
          </button>
          <button
            onClick={onNewJournalEntry}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            + New Journal Entry
          </button>
          <button
            onClick={() => { setGlAccountFilter('all'); setGlPartyFilter('all'); setFromDate(''); setToDate(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '500' }}
          >
            <RefreshCw size={14} /> Reset Filters
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: '600', fontSize: '14px' }}>
          <Filter size={16} /> Filters:
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Filter by Account</label>
          <select
            value={glAccountFilter}
            onChange={e => setGlAccountFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#0f172a' }}
          >
            <option value="all" style={{ color: '#0f172a' }}>All Accounts (Complete Ledger)</option>
            <option value="Debtors" style={{ color: '#0f172a' }}>Debtors (Customer Accounts)</option>
            <option value="Creditors" style={{ color: '#0f172a' }}>Creditors (Supplier Accounts)</option>
            <option value="Bank Account" style={{ color: '#0f172a' }}>Bank Account</option>
            <option value="Cash Account">Cash Account</option>
            <option value="Sales Income" style={{ color: '#0f172a' }}>Sales Income</option>
            <option value="Stock Received But Not Billed" style={{ color: '#0f172a' }}>Stock Received (Purchases)</option>
            <option value="Input GST" style={{ color: '#0f172a' }}>Input GST</option>
            <option value="Output GST" style={{ color: '#0f172a' }}>Output GST</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Filter by Party</label>
          <select
            value={glPartyFilter}
            onChange={e => setGlPartyFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#0f172a' }}
          >
            <option value="all" style={{ color: '#0f172a' }}>All Parties</option>
            {allPartyNames.map((p, idx) => (
              <option key={idx} value={p} style={{ color: '#0f172a' }}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ width: '140px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ width: '140px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Total Debits:</span>
          <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#0369a1' }}>Rs. {totalDebit.toFixed(2)}</h3>
        </div>
        <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Total Credits:</span>
          <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#15803d' }}>Rs. {totalCredit.toFixed(2)}</h3>
        </div>
        <div style={{ background: '#fff', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Statement Closing Balance:</span>
          <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: closingBalance >= 0 ? '#0f172a' : '#b91c1c' }}>
            Rs. {Math.abs(closingBalance).toFixed(2)} {closingBalance >= 0 ? 'Dr' : 'Cr'}
          </h3>
        </div>
      </div>

      <button
        onClick={() => {
          const exportData = glEntries.map(entry => ({
            'Date': entry.posting_date,
            'Voucher Type': entry.voucher_type,
            'Voucher No': entry.voucher_no,
            'Account': entry.account,
            'Party': entry.party || '-',
            'Debit (Rs)': entry.debit,
            'Credit (Rs)': entry.credit,
            'Balance (Rs)': entry.balance
          }));
          exportToCSV(exportData, 'General_Ledger');
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
      >
        <Download size={14} /> Export CSV
      </button>

      <DataTable<GLEntryRow>
        columns={[
          { header: 'Date', accessor: 'posting_date' },
          { header: 'Voucher', accessor: r => <strong>{r.voucher_type} #{r.voucher_no}</strong> },
          { header: 'Account', accessor: 'account' },
          { header: 'Party', accessor: r => r.party || '-' },
          { header: 'Debit (Rs.)', accessor: r => Number(r.debit) > 0 ? <span style={{ color: '#0369a1', fontWeight: '600' }}>Rs. {Number(r.debit).toFixed(2)}</span> : '-' },
          { header: 'Credit (Rs.)', accessor: r => Number(r.credit) > 0 ? <span style={{ color: '#15803d', fontWeight: '600' }}>Rs. {Number(r.credit).toFixed(2)}</span> : '-' },
          { header: 'Running Bal (Rs.)', accessor: r => <strong>Rs. {Number(r.balance).toFixed(2)}</strong> }
        ]}
        data={glEntries}
        emptyMessage="No ledger entries match the selected filters."
      />
    </div>
  );
};