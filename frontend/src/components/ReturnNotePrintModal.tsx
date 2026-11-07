import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface ReturnNoteLine {
    item: number;
    quantity: string | number;
    rate: string | number;
    amount: string | number;
}

interface ReturnNote {
    credit_note_number?: string;
    debit_note_number?: string;
    customer_name?: string;
    supplier_name?: string;
    reason?: string | null;
    posting_date: string;
    net_total: string | number;
    tax_amount: string | number;
    grand_total: string | number;
    items: ReturnNoteLine[];
}

interface StockItem {
    id: number;
    item_name: string;
    item_code: string;
}

interface PartyDetails {
    address?: string;
    city?: string;
    postal_code?: string;
    gstin?: string;
    gst_category?: string;
    email?: string;
    mobile_no?: string;
}

interface ReferenceInvoice {
    number: string;
    date: string;
}

interface ReturnNotePrintModalProps {
    note: ReturnNote;
    noteType: 'Credit' | 'Debit';
    stockItems: StockItem[];
    party?: PartyDetails;
    referenceInvoice?: ReferenceInvoice;
    onClose: () => void;
}

export const ReturnNotePrintModal: React.FC<ReturnNotePrintModalProps> = ({
    note,
    noteType,
    stockItems,
    party,
    referenceInvoice,
    onClose
}) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [downloadError, setDownloadError] = useState('');
    const isCredit = noteType === 'Credit';
    const noteNumber = isCredit ? note.credit_note_number : note.debit_note_number;
    const partyName = isCredit ? note.customer_name : note.supplier_name;
    const handlePrint = () => window.print();
    const netTotal = Number(note.net_total) || 0;
    const taxAmount = Number(note.tax_amount) || 0;
    const grandTotal = Number(note.grand_total) || 0;
    const printTitle = `${noteType}_Note_${noteNumber || 'note'}`;

    useEffect(() => {
        const originalTitle = document.title;
        document.title = printTitle;
        return () => {
            document.title = originalTitle;
        };
    }, [printTitle]);

    const handleDownloadPDF = useCallback(async () => {
        const element = printRef.current;
        if (!element) {
            setDownloadError('The note preview is not ready. Please try again.');
            return;
        }

        setDownloadError('');
        const originalOverflow = element.style.overflowY;
        element.style.overflowY = 'visible';

        try {
            await html2pdf().set({
                margin: [10, 10, 10, 10],
                filename: `${noteNumber || 'note'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(element).save();
        } catch (error) {
            console.error('Error downloading return note PDF:', error);
            setDownloadError('PDF download failed. Please try Print / Save PDF instead.');
        } finally {
            element.style.overflowY = originalOverflow;
        }
    }, [noteNumber]);

    return (
        <div className="return-note-dialog" style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: 20,
            background: 'rgba(15, 23, 42, 0.65)'
        }}>
            <style>{`
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                    html, body {
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * { visibility: hidden !important; }
                    .return-note-no-print { display: none !important; }
                    #printable-return-note, #printable-return-note * { visibility: visible !important; }
                    #printable-return-note {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #printable-return-note thead { display: table-header-group; }
                    #printable-return-note tr,
                    #printable-return-note > div { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>
            <div className="return-note-backdrop" style={{
                width: 820,
                maxWidth: '100%',
                maxHeight: '94vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,.25)'
            }}>
                <div className="return-note-no-print" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 20px',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <strong style={{ color: '#334155' }}>{noteType} Note Preview - {noteNumber}</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button
                            type="button"
                            onClick={handlePrint}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#0284c7',
                                color: '#fff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            <Printer size={16} /> Print / Save PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDownloadPDF()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 13
                            }}
                        >
                            <Download size={15} /> Download PDF
                        </button>
                        <button type="button" onClick={onClose} style={buttonStyle('#64748b')}>
                            <X size={15} /> Close
                        </button>
                    </div>
                </div>
                {downloadError && (
                    <p role="alert" className="return-note-no-print" style={{ margin: '10px 20px', color: '#b91c1c' }}>
                        {downloadError}
                    </p>
                )}
                <div id="printable-return-note" ref={printRef} style={{
                    overflowY: 'auto',
                    padding: '30px 36px',
                    color: '#0f172a',
                    fontFamily: 'Arial, sans-serif',
                    background: '#fff'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 20,
                        paddingBottom: 16,
                        borderBottom: `2px solid ${isCredit ? '#0284c7' : '#dc2626'}`
                    }}>
                        <div>
                            <h1 style={{ margin: '0 0 4px', color: '#0284c7', fontSize: 22 }}>TallyBIZ ENTERPRISE</h1>
                            <p style={{ margin: 0, color: '#475569', fontSize: 12, lineHeight: 1.5 }}>
                                SG Highway, Ahmedabad, Gujarat - 380054<br />
                                GSTIN: 24ABCDE1234F1Z5 | State: Gujarat (24)<br />
                                Email: accounts@tallybiz.com | Phone: +91 98765 43210
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.7 }}>
                            <strong style={{
                                display: 'inline-block',
                                marginBottom: 6,
                                padding: '4px 10px',
                                borderRadius: 4,
                                color: isCredit ? '#0369a1' : '#b91c1c',
                                background: isCredit ? '#e0f2fe' : '#fee2e2'
                            }}>{isCredit ? 'CREDIT NOTE' : 'DEBIT NOTE'}</strong>
                            <div><strong>Note No:</strong> {noteNumber}</div>
                            <div><strong>Date:</strong> {note.posting_date}</div>
                        </div>
                    </div>

                    <div style={{
                        margin: '20px 0',
                        padding: '12px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        background: '#f8fafc'
                    }}>
                        <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                            {isCredit ? 'Billed To (Customer Details)' : 'Returned To (Supplier Details)'}
                        </div>
                        <strong style={{ display: 'block', marginTop: 4, fontSize: 16 }}>{partyName || '-'}</strong>
                        <div style={{ marginTop: 5, color: '#475569', fontSize: 12, lineHeight: 1.6 }}>
                            {party?.address && <>{party.address}<br /></>}
                            {[party?.city, party?.postal_code].filter(Boolean).join(' - ') || 'Address Not Provided'}<br />
                            <strong>GSTIN:</strong> {party?.gstin || 'Unregistered'}
                            {party?.gst_category && <> | <strong>Category:</strong> {party.gst_category}</>}
                            {party?.mobile_no && <> | <strong>Phone:</strong> {party.mobile_no}</>}
                            {party?.email && <><br /><strong>Email:</strong> {party.email}</>}
                        </div>
                    </div>

                    <div style={{ margin: '16px 0', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12 }}>
                            <div>
                                <span style={{ display: 'block', color: '#64748b', marginBottom: 3 }}>Return Type / Ledger</span>
                                <strong>{isCredit ? 'Sales Return · Credit Note' : 'Purchase Return · Debit Note'}</strong>
                            </div>
                            <div>
                                <span style={{ display: 'block', color: '#64748b', marginBottom: 3 }}>Stock Movement</span>
                                <strong>{isCredit ? 'Inventory In (Sales Return)' : 'Inventory Out (Purchase Return)'}</strong>
                            </div>
                            <div>
                                <span style={{ display: 'block', color: '#64748b', marginBottom: 3 }}>
                                    Reference {isCredit ? 'Sales Invoice' : 'Purchase Bill'}
                                </span>
                                <strong>{referenceInvoice?.number || 'Not linked'}</strong>
                                {referenceInvoice && <div style={{ color: '#64748b', marginTop: 2 }}>Date: {referenceInvoice.date}</div>}
                            </div>
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                            <span style={{ display: 'block', color: '#64748b', fontSize: 11, marginBottom: 3 }}>Reason for Return</span>
                            <span style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{note.reason || 'Not specified'}</span>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                                {['#', 'Item', 'Quantity', 'Rate (Rs.)', 'Amount (Rs.)'].map(header => (
                                    <th key={header} style={{ padding: 9, textAlign: header === '#' || header === 'Item' ? 'left' : 'right' }}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {note.items.map((line, index) => {
                                const stockItem = stockItems.find(item => item.id === line.item);
                                return (
                                    <tr key={`${line.item}-${index}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: 9 }}>{index + 1}</td>
                                        <td style={{ padding: 9 }}>
                                            <strong>{stockItem?.item_name || `Item #${line.item}`}</strong>
                                            <div style={{ color: '#64748b', fontSize: 11 }}>{stockItem?.item_code || ''}</div>
                                        </td>
                                        <td style={{ padding: 9, textAlign: 'right' }}>{line.quantity}</td>
                                        <td style={{ padding: 9, textAlign: 'right' }}>{Number(line.rate).toFixed(2)}</td>
                                        <td style={{ padding: 9, textAlign: 'right' }}>{Number(line.amount).toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                        <div style={{ width: 280, fontSize: 13 }}>
                            <SummaryRow label="Net Total" value={netTotal} />
                            <SummaryRow label="GST (18%)" value={taxAmount} />
                            <SummaryRow label="Grand Total" value={grandTotal} strong />
                        </div>
                    </div>
                    <p style={{ marginTop: 50, textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                        Authorized Signatory
                    </p>
                </div>
            </div>
        </div>
    );
};

function buttonStyle(background: string): React.CSSProperties {
    return {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '8px 11px',
        border: 0,
        borderRadius: 5,
        color: '#fff',
        background,
        cursor: 'pointer',
        fontWeight: 600
    };
}

function SummaryRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '7px 0',
            borderBottom: '1px solid #e2e8f0',
            fontWeight: strong ? 700 : 400
        }}>
            <span>{label}</span>
            <span>Rs. {value.toFixed(2)}</span>
        </div>
    );
}
