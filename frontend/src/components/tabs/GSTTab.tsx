import type { FC } from 'react';
import { Printer } from 'lucide-react';
import { DataTable } from '../DataTable';

interface GSTDataRow {
  id?: string | number;
  month: string;
  sales: number;
  purchases: number;
  output_gst: number;
  input_gst: number;
  net_gst: number;
}

interface GSTTabProps {
  gstData: GSTDataRow[];
  setShowGSTPrintModal: (show: boolean) => void;
}

export const GSTTab: FC<GSTTabProps> = ({
  gstData,
  setShowGSTPrintModal,
}) => {
  const totalOutput = gstData.reduce((sum, d) => sum + (d.output_gst || 0), 0);
  const totalInput = gstData.reduce((sum, d) => sum + (d.input_gst || 0), 0);
  const netPayable = totalOutput - totalInput;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0' }}>GST Overview & Tax Compliance</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Monthly Output GST, Input Tax Credit (ITC) & Net Liability</p>
        </div>
        <button
          onClick={() => setShowGSTPrintModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          <Printer size={16} /> Print GST Summary
        </button>
      </div>

      {/* GST Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Output GST (Liability)</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '22px', color: '#dc2626' }}>Rs. {totalOutput.toFixed(2)}</h3>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Input GST (ITC)</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '22px', color: '#15803d' }}>Rs. {totalInput.toFixed(2)}</h3>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Net GST {netPayable >= 0 ? 'Payable' : 'Credit Balance'}</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '22px', color: netPayable >= 0 ? '#b91c1c' : '#0284c7' }}>
            Rs. {Math.abs(netPayable).toFixed(2)} {netPayable < 0 ? '(ITC Carry Forward)' : ''}
          </h3>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <DataTable<GSTDataRow>
        columns={[
          { header: 'Month', accessor: 'month' },
          { header: 'Taxable Sales (Rs.)', accessor: r => `Rs. ${(r.sales || 0).toFixed(2)}` },
          { header: 'Output GST (Rs.)', accessor: r => <span style={{ color: '#dc2626', fontWeight: '600' }}>Rs. {(r.output_gst || 0).toFixed(2)}</span> },
          { header: 'Taxable Purchases (Rs.)', accessor: r => `Rs. ${(r.purchases || 0).toFixed(2)}` },
          { header: 'Input GST / ITC (Rs.)', accessor: r => <span style={{ color: '#15803d', fontWeight: '600' }}>Rs. {(r.input_gst || 0).toFixed(2)}</span> },
          {
            header: 'Net Payable / (Credit)',
            accessor: r => (
              <strong style={{ color: r.net_gst >= 0 ? '#b91c1c' : '#0284c7' }}>
                Rs. {r.net_gst >= 0 ? r.net_gst.toFixed(2) : `(${Math.abs(r.net_gst).toFixed(2)})`}
              </strong>
            )
          }
        ]}
        data={gstData}
        emptyMessage="No GST transaction history available."
      />
    </div>
  );
};