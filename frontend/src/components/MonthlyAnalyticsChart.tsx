import React from 'react';

interface MonthlyData {
  month: string;
  sales_net: number;
  purchase_net: number;
}

interface MonthlyAnalyticsChartProps {
  data: MonthlyData[];
}

export const MonthlyAnalyticsChart: React.FC<MonthlyAnalyticsChartProps> = ({ data }) => {
  // Chronological order ma set karo (oldest to newest) jethi graph left to right barabar dekhay
  const chartData = [...data].reverse();

  // Graph ni height scale karva mate maximum amount shodhvi
  const maxVal = Math.max(
    ...chartData.map(d => Math.max(Number(d.sales_net) || 0, Number(d.purchase_net) || 0)),
    1000
  );

  const formatMonth = (m: string) => {
    try {
      const parts = m.split('-');
      if (parts.length === 2) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) return `${monthNames[mIdx]} ${parts[0]}`;
      }
    } catch {}
    return m;
  };

  const formatAmount = (num: number) => {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)} k`;
    return `₹${num.toFixed(0)}`;
  };

  return (
    <div style={{
      background: '#fff',
      padding: '24px',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Header & Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>
            Monthly Performance: Sales vs Purchases
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Taxable turnover comparison across fiscal months
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#0284c7', borderRadius: '3px', display: 'inline-block' }} />
            <span style={{ color: '#334155', fontWeight: '500' }}>Sales Turnover</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#dc2626', borderRadius: '3px', display: 'inline-block' }} />
            <span style={{ color: '#334155', fontWeight: '500' }}>Purchases</span>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
          No monthly sales or purchase transactions recorded yet.
        </div>
      ) : (
        <div style={{ position: 'relative', height: '220px', marginTop: '20px', display: 'flex', alignItems: 'flex-end', gap: '32px', paddingBottom: '30px', borderBottom: '1px solid #cbd5e1' }}>
          {/* Background Grid Lines */}
          <div style={{ position: 'absolute', inset: '0 0 30px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
            {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <span style={{ width: '70px', fontSize: '11px', color: '#94a3b8', textAlign: 'right', paddingRight: '8px' }}>
                  {formatAmount(maxVal * ratio)}
                </span>
                <div style={{ flex: 1, borderTop: idx === 4 ? '1px solid #cbd5e1' : '1px dashed #e2e8f0' }} />
              </div>
            ))}
          </div>

          {/* Bar Columns Container */}
          <div style={{ display: 'flex', gap: '48px', paddingLeft: '85px', height: '100%', alignItems: 'flex-end', zIndex: 1, overflowX: 'auto', flex: 1 }}>
            {chartData.map((d, i) => {
              const salesH = Math.max(((Number(d.sales_net) || 0) / maxVal) * 100, 2);
              const purH = Math.max(((Number(d.purchase_net) || 0) / maxVal) * 100, 2);

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: '95px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '100%' }}>
                    {/* Sales Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: 'bold', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                        {formatAmount(Number(d.sales_net) || 0)}
                      </span>
                      <div
                        title={`Sales: Rs. ${(Number(d.sales_net) || 0).toFixed(2)}`}
                        style={{
                          width: '32px',
                          height: `${salesH}%`,
                          background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.4s ease'
                        }}
                      />
                    </div>

                    {/* Purchases Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 'bold', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                        {formatAmount(Number(d.purchase_net) || 0)}
                      </span>
                      <div
                        title={`Purchases: Rs. ${(Number(d.purchase_net) || 0).toFixed(2)}`}
                        style={{
                          width: '32px',
                          height: `${purH}%`,
                          background: 'linear-gradient(180deg, #f87171 0%, #dc2626 100%)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.4s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Month Label */}
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginTop: '10px', whiteSpace: 'nowrap' }}>
                    {formatMonth(d.month)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};