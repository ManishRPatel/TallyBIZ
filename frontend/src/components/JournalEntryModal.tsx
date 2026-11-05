import { useState, type FC, type FormEvent } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { JournalEntryPayload, JournalEntryLineForm } from '../types/erp';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: JournalEntryPayload) => Promise<void>;
  allPartyNames: string[];
}

const DEFAULT_ACCOUNTS = [
  'Bank Account',
  'Cash Account',
  'Debtors',
  'Creditors',
  'Office Rent Expense',
  'Salary Expense',
  'Electricity Expense',
  'Printing & Stationery',
  'Travelling Expense',
  'Sales Income',
  'Input GST',
  'Output GST'
];

export const JournalEntryModal: FC<JournalEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  allPartyNames,
}) => {
  const [voucherNo, setVoucherNo] = useState(`JV-${Date.now().toString().slice(-4)}`);
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherType, setVoucherType] = useState<'Journal Entry' | 'Contra Entry' | 'Expense Entry'>('Journal Entry');
  const [narration, setNarration] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [lines, setLines] = useState<JournalEntryLineForm[]>([
    { account: 'Bank Account', party_type: '', party_name: '', debit: '0', credit: '0' },
    { account: 'Cash Account', party_type: '', party_name: '', debit: '0', credit: '0' },
  ]);

  if (!isOpen) return null;

  const handleLineChange = (index: number, field: keyof JournalEntryLineForm, value: string) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLine = () => {
    setLines(prev => [
      ...prev,
      { account: 'Bank Account', party_type: '', party_name: '', debit: '0', credit: '0' }
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      alert('A journal entry requires at least 2 lines (Debit & Credit).');
      return;
    }
    setLines(prev => prev.filter((_, idx) => idx !== index));
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && totalCredit > 0 && totalDebit === totalCredit;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert(`Entry is not balanced! Total Debit (₹${totalDebit.toFixed(2)}) must equal Total Credit (₹${totalCredit.toFixed(2)}).`);
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        voucher_no: voucherNo,
        posting_date: postingDate,
        voucher_type: voucherType,
        narration,
        lines,
      });
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save Journal Entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '880px', maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>New Journal Voucher (Double-Entry)</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Post contra, expense or adjustment entries directly to the General Ledger</p>
          </div>
          <button onClick={onClose} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Voucher No *</label>
              <input required value={voucherNo} onChange={e => setVoucherNo(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Posting Date *</label>
              <input type="date" required value={postingDate} onChange={e => setPostingDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Voucher Type</label>
              <select value={voucherType} onChange={e => setVoucherType(e.target.value as any)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: '#fff' }}>
                <option value="Journal Entry">Journal Entry (General)</option>
                <option value="Contra Entry">Contra Entry (Bank & Cash)</option>
                <option value="Expense Entry">Expense Entry (Office / Misc)</option>
              </select>
            </div>
          </div>

          {/* Lines Table */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Account</th>
                  <th style={{ padding: '10px 12px' }}>Party (Optional)</th>
                  <th style={{ padding: '10px 12px', width: '140px' }}>Debit (₹)</th>
                  <th style={{ padding: '10px 12px', width: '140px' }}>Credit (₹)</th>
                  <th style={{ padding: '10px 12px', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        list={`account-options-${idx}`}
                        value={line.account}
                        onChange={e => handleLineChange(idx, 'account', e.target.value)}
                        placeholder="Type or select account"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                      <datalist id={`account-options-${idx}`}>
                        {DEFAULT_ACCOUNTS.map((acc, aIdx) => (
                          <option key={aIdx} value={acc} />
                        ))}
                      </datalist>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        value={line.party_name || ''}
                        onChange={e => handleLineChange(idx, 'party_name', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                      >
                        <option value="">-- No Party --</option>
                        {allPartyNames.map((p, pIdx) => (
                          <option key={pIdx} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={line.debit}
                        onChange={e => {
                          handleLineChange(idx, 'debit', e.target.value);
                          if (parseFloat(e.target.value) > 0) handleLineChange(idx, 'credit', '0');
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={line.credit}
                        onChange={e => {
                          handleLineChange(idx, 'credit', e.target.value);
                          if (parseFloat(e.target.value) > 0) handleLineChange(idx, 'debit', '0');
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        title="Delete line"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={addLine}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
            >
              <Plus size={14} /> Add Row
            </button>

            {/* Validation & Balance Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
              <div>Total Debit: <strong style={{ color: '#0284c7' }}>₹{totalDebit.toFixed(2)}</strong></div>
              <div>Total Credit: <strong style={{ color: '#15803d' }}>₹{totalCredit.toFixed(2)}</strong></div>
              {isBalanced ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#15803d', fontWeight: 'bold' }}>
                  <CheckCircle2 size={16} /> Balanced
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 'bold' }}>
                  <AlertCircle size={16} /> Diff: ₹{difference.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Narration */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Narration / Remarks</label>
            <textarea
              rows={2}
              value={narration}
              onChange={e => setNarration(e.target.value)}
              placeholder="e.g. Cash withdrawn from HDFC Bank for office expenses"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', fontSize: '13px' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isBalanced || submitting}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: isBalanced ? '#0284c7' : '#94a3b8',
                color: '#fff',
                fontWeight: '600',
                cursor: isBalanced ? 'pointer' : 'not-allowed'
              }}
            >
              {submitting ? 'Posting...' : 'Save & Post Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};