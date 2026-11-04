import type { FC } from 'react';
import { Plus, Download, Search, Edit2 } from 'lucide-react';
import { DataTable } from '../DataTable';
import type { Item } from '../../types/erp';
import { exportToCSV } from '../../utils/erpHelpers';

interface StockTabProps {
  items: Item[];
  filteredItems: Item[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setEditingId: (id: number | null) => void;
  setItemForm: any;
  setShowItemModal: (show: boolean) => void;
}

export const StockTab: FC<StockTabProps> = ({
  items,
  filteredItems,
  searchQuery,
  setSearchQuery,
  setEditingId,
  setItemForm,
  setShowItemModal,
}) => {
  const totalItemsCount = items.length;
  const totalValuation = items.reduce((sum, it) => sum + ((parseFloat(String(it.current_stock)) || 0) * (parseFloat(String(it.standard_rate)) || 0)), 0);
  const lowStockCount = items.filter(it => (parseFloat(String(it.current_stock)) || 0) <= 10).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Stock Items & Inventory</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Real-time warehouse stock balance, valuation and reorder health</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              const exportData = items.map(it => ({
                'Item Code': it.item_code,
                'Item Name': it.item_name,
                'Category': it.category,
                'Unit': it.unit,
                'Rate (Rs)': it.standard_rate,
                'Current Stock': it.current_stock,
                'Stock Value (Rs)': ((parseFloat(String(it.current_stock)) || 0) * (parseFloat(String(it.standard_rate)) || 0)).toFixed(2),
                'Status': (parseFloat(String(it.current_stock)) || 0) <= 0 ? 'Out of Stock' : (parseFloat(String(it.current_stock)) || 0) <= 10 ? 'Low Stock' : 'In Stock'
              }));
              exportToCSV(exportData, 'Stock_Inventory_Report');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            <Download size={16} /> Export Stock
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setItemForm({ item_code: '', item_name: '', category: 'General', unit: 'Nos', standard_rate: '0', current_stock: '0' });
              setShowItemModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
          >
            <Plus size={16} /> New Item
          </button>
        </div>
      </div>

      {/* Inventory Summary & Low Stock Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total SKUs / Items</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', color: '#0f172a' }}>{totalItemsCount} Products</h3>
        </div>
        <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Inventory Valuation</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', color: '#0284c7' }}>Rs. {totalValuation.toFixed(2)}</h3>
        </div>
        <div style={{ padding: '18px 20px', borderRadius: '10px', border: lowStockCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0', background: lowStockCount > 0 ? '#fff5f5' : '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: lowStockCount > 0 ? '#b91c1c' : '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Low / Out of Stock Alert</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', color: lowStockCount > 0 ? '#dc2626' : '#15803d' }}>
            {lowStockCount} Items Need Attention
          </h3>
        </div>
      </div>

      {/* Live Search Input Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search item code, name, or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
            Clear Search
          </button>
        )}
      </div>

      <DataTable<Item>
        columns={[
          { header: 'Code', accessor: 'item_code' },
          { header: 'Item Name', accessor: 'item_name' },
          { header: 'Category', accessor: 'category' },
          { header: 'Rate (Rs.)', accessor: r => `Rs. ${r.standard_rate}` },
          { header: 'Current Stock', accessor: r => <strong>{r.current_stock} {r.unit}</strong> },
          {
            header: 'Stock Value',
            accessor: r => (
              <span style={{ color: '#0284c7', fontWeight: '600' }}>
                Rs. {((parseFloat(String(r.current_stock)) || 0) * (parseFloat(String(r.standard_rate)) || 0)).toFixed(2)}
              </span>
            )
          },
          {
            header: 'Inventory Health',
            accessor: (r) => {
              const stock = parseFloat(String(r.current_stock)) || 0;
              if (stock <= 0) {
                return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Out of Stock</span>;
              } else if (stock <= 10) {
                return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Low Stock ({stock})</span>;
              }
              return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>In Stock</span>;
            }
          },
          {
            header: 'Action',
            accessor: (row) => (
              <button
                onClick={() => {
                  setEditingId(row.id || null);
                  setItemForm({
                    item_code: row.item_code,
                    item_name: row.item_name,
                    category: row.category,
                    unit: row.unit,
                    standard_rate: row.standard_rate.toString(),
                    current_stock: row.current_stock.toString()
                  });
                  setShowItemModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#0369a1' }}
              >
                <Edit2 size={12} /> Edit
              </button>
            )
          }
        ]}
        data={filteredItems}
        emptyMessage="No items registered in stock."
      />
    </div>
  );
};