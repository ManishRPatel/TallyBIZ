import type { FC } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { DataTable } from '../DataTable';
import type { Item, StockLedgerRow } from '../../types/erp';

interface StockLedgerTabProps {
  stockLedger: StockLedgerRow[];
  items: Item[];
  stockItemFilter: string;
  setStockItemFilter: (filter: string) => void;
}

export const StockLedgerTab: FC<StockLedgerTabProps> = ({
  stockLedger,
  items,
  stockItemFilter,
  setStockItemFilter,
}) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Stock Movement & Valuation Ledger</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Chronological register of inward receipts, outward issues & item balances</p>
        </div>
        <button
          onClick={() => setStockItemFilter('all')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '500' }}
        >
          <RefreshCw size={14} /> Reset Item Filter
        </button>
      </div>

      <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', fontWeight: '600', fontSize: '14px' }}>
          <Filter size={16} /> Filter by Item:
        </div>
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <select
            value={stockItemFilter}
            onChange={e => setStockItemFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#0f172a' }}
          >
            <option value="all" style={{ color: '#0f172a' }}>All Inventory Items</option>
            {items.map(it => (
              <option key={it.id} value={it.id} style={{ color: '#0f172a' }}>{it.item_name} ({it.item_code})</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable<StockLedgerRow>
        columns={[
          { header: 'Date', accessor: 'posting_date' },
          { header: 'Item Name', accessor: r => <strong>{r.item_name} ({r.item_code})</strong> },
          { header: 'Voucher', accessor: r => `${r.voucher_type} #${r.voucher_no}` },
          { header: 'Inward (+)', accessor: r => r.in_qty > 0 ? <span style={{ color: '#15803d', fontWeight: '600' }}>+{r.in_qty}</span> : '-' },
          { header: 'Outward (-)', accessor: r => r.out_qty > 0 ? <span style={{ color: '#b91c1c', fontWeight: '600' }}>-{r.out_qty}</span> : '-' },
          { header: 'Balance Qty', accessor: r => <strong>{r.balance_qty}</strong> },
          { header: 'Valuation Rate', accessor: r => `Rs. ${r.valuation_rate.toFixed(2)}` },
          { header: 'Total Value', accessor: r => <strong style={{ color: '#0284c7' }}>Rs. {r.balance_value.toFixed(2)}</strong> }
        ]}
        data={stockLedger}
        emptyMessage="No stock transactions found for the selected criteria."
      />
    </div>
  );
};