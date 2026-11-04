import React, { useEffect } from 'react';
import { X, Printer } from 'lucide-react';

interface GSTRow {
  month: string;
  sales_net: number;
  output_tax: number;
  purchase_net: number;
  input_itc: number;
  net_gst_payable: number;
  itc_carry_forward: number;
}

interface GSTPrintModalProps {
  data: GSTRow[];
  onClose: () => void;
}

export const GSTPrintModal: React.FC<GSTPrintModalProps> = ({ data, onClose }) => {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `GST_Return_Summary_${new Date().toISOString().split('T')[0]}`;
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, overflowY: 'auto', padding: '20px' }}>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden; }
          #printable-gst-report, #printable-gst-report * { visibility: visible; }
          #printable-gst-report { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15mm !important; box-shadow: none !important; border: none !important; box-sizing: border-box !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ background: '#fff', borderRadius: '12px', width: '850px', maxWidth: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', maxHeight: '94vh' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontWeight: '600', color: '#334155', fontSize: '16px' }}>GST Return Summary (GSTR-1 & GSTR-3B Preview)</span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
              <Printer size={16} /> Print / Save PDF
            </button>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
              <X size={16} /> Close
            </button>
          </div>
        </div>

        <div id="printable-gst-report" style={{ padding: '30px 36px', overflowY: 'auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a', boxSizing: 'border-box', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0284c7', paddingBottom: '16px' }}>
            <div>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 'bold', color: '#0284c7' }}>TallyBIZ ENTERPRISE</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                SG Highway, Ahmedabad, Gujarat - 380054<br />
                GSTIN: <strong>24ABCDE1234F1Z5</strong> | State: Gujarat (24)
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>
                GST RETURN SUMMARY (GSTR-1 / 3B)
              </span>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}><strong>Generated On:</strong> {new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Month</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Taxable Sales (Rs.)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Output GST (GSTR-1)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Taxable Purchases (Rs.)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Input ITC</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Net Payable / ITC</th>
                </tr>
              </thead>
              <tbody>
                {data && data.length > 0 ? (
                  data.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.month}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>Rs. {row.sales_net.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0369a1', fontWeight: '600' }}>Rs. {row.output_tax.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>Rs. {row.purchase_net.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#15803d', fontWeight: '600' }}>Rs. {row.input_itc.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: row.net_gst_payable > 0 ? '#b91c1c' : '#0284c7' }}>
                        {row.net_gst_payable > 0 ? `Payable: Rs. ${row.net_gst_payable.toFixed(2)}` : `ITC Credit: Rs. ${row.itc_carry_forward.toFixed(2)}`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No GST transaction records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '50px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
            <div>Note: This is a system-generated summary report derived from registered sales invoices and purchase bills for GST filing assistance.</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 32px 0', fontWeight: 'bold', color: '#334155' }}>For, TallyBIZ Enterprise</p>
              <span style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', display: 'inline-block', width: '160px' }}>Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};