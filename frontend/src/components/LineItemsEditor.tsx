import type { FC } from 'react';
import type { Item } from '../types/erp';
import { Plus, Trash2 } from 'lucide-react';
import { newLine, fieldStyle, type LineForm } from '../utils/erpHelpers';

interface LineItemsEditorProps {
  lines: LineForm[];
  items: Item[];
  showStock: boolean;
  onChange: (lines: LineForm[]) => void;
}

export const LineItemsEditor: FC<LineItemsEditorProps> = ({ lines, items, showStock, onChange }) => {
  const update = (idx: number, patch: Partial<LineForm>) =>
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const selectedItemIds = new Set(
    lines.map(l => l.item_id).filter(id => id && id.trim() !== '')
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lines.map((line, idx) => {
        const selItem = items.find(i => i.id === parseInt(line.item_id, 10));
        const availableStock = selItem ? Number(selItem.current_stock) : 0;
        const currentQty = parseFloat(line.quantity) || 0;
        const currentRate = parseFloat(line.rate) || 0;
        const discPercent = parseFloat(line.discount_percentage || '0') || 0;

        // FOC hoy to amount 0, nahi to discount baad thase
        let lineAmount = 0;
        if (!line.is_foc) {
          const baseAmount = currentQty * currentRate;
          const discountAmt = (baseAmount * discPercent) / 100;
          lineAmount = Math.max(0, baseAmount - discountAmt);
        }

        const availableItems = items.filter(it => {
          if (it.id == null) return false;
          const itemIdStr = String(it.id);
          const isSelectedInOtherLine = selectedItemIds.has(itemIdStr) && itemIdStr !== line.item_id;
          return !isSelectedInOtherLine;
        });

        return (
          <div
            key={line.uid}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,2fr) minmax(0,0.9fr) minmax(0,1fr) 50px minmax(0,0.9fr) minmax(0,1.1fr) auto',
              gap: '8px',
              alignItems: 'end'
            }}
          >
            {/* Item Select */}
            <div style={{ minWidth: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: '600' }}>Item *</label>
              <select
                required
                style={fieldStyle}
                value={line.item_id}
                onChange={e => {
                  const sel = items.find(i => i.id === parseInt(e.target.value, 10));
                  update(idx, {
                    item_id: e.target.value,
                    rate: sel ? String(sel.standard_rate) : line.rate
                  });
                }}
              >
                <option value="">-- Choose Item --</option>
                {availableItems.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.item_name}{showStock ? ` - Stock: ${it.current_stock}` : ` (${it.item_code})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600' }}>Qty *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                style={{
                  ...fieldStyle,
                  borderColor: (showStock && currentQty > availableStock) ? '#ef4444' : '#cbd5e1'
                }}
                value={line.quantity}
                onChange={e => update(idx, { quantity: e.target.value })}
              />
              {showStock && selItem && currentQty > availableStock && (
                <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>
                  Exceeds stock ({availableStock})
                </div>
              )}
            </div>

            {/* Rate */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600' }}>Rate *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                disabled={line.is_foc}
                style={{
                  ...fieldStyle,
                  background: line.is_foc ? '#f1f5f9' : '#ffffff',
                  color: line.is_foc ? '#94a3b8' : '#000000'
                }}
                value={line.is_foc ? '0' : line.rate}
                onChange={e => update(idx, { rate: e.target.value })}
              />
            </div>

            {/* FOC Checkbox */}
            <div style={{ textAlign: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>FOC</label>
              <input
                type="checkbox"
                checked={!!line.is_foc}
                onChange={e => {
                  const focChecked = e.target.checked;
                  update(idx, {
                    is_foc: focChecked,
                    ...(focChecked ? { rate: '0', discount_percentage: '0' } : {})
                  });
                }}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                title="Free of Cost (Sample)"
              />
            </div>

            {/* Disc % */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600' }}>Disc %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={line.is_foc}
                style={{
                  ...fieldStyle,
                  background: line.is_foc ? '#f1f5f9' : '#ffffff',
                  color: line.is_foc ? '#94a3b8' : '#000000'
                }}
                value={line.is_foc ? '0' : (line.discount_percentage ?? '0')}
                onChange={e => update(idx, { discount_percentage: e.target.value })}
              />
            </div>

            {/* Taxable Amount */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600' }}>Amount</label>
              <div style={{ padding: '8px 0', fontWeight: '600', whiteSpace: 'nowrap' }}>
                Rs. {lineAmount.toFixed(2)}
              </div>
            </div>

            {/* Remove Line Button */}
            <button
              type="button"
              onClick={() => onChange(lines.filter((_, i) => i !== idx))}
              disabled={lines.length === 1}
              title="Remove line"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #fca5a5',
                background: '#fee2e2',
                color: '#b91c1c',
                cursor: lines.length === 1 ? 'not-allowed' : 'pointer',
                opacity: lines.length === 1 ? 0.5 : 1
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...lines, newLine()])}
        style={{
          alignSelf: 'flex-start',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px dashed #94a3b8',
          background: '#f8fafc',
          color: '#475569',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        <Plus size={14} /> Add Line
      </button>
    </div>
  );
};