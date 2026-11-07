import React, { useState } from 'react';
import axios from 'axios';

export default function ReturnsTab() {
    const [returnType, setReturnType] = useState<'Credit' | 'Debit'>('Credit');
    const [noteNumber, setNoteNumber] = useState('');
    const [partyName, setPartyName] = useState('');
    const [postingDate, setPostingDate] = useState('');
    const [items, setItems] = useState<Array<{ item: string | number; quantity: number; rate: number }>>([
        { item: '', quantity: 1, rate: 0 }
    ]);

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items] as any;
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItemRow = () => {
        setItems([...items, { item: '', quantity: 1, rate: 0 }]);
    };

    const removeItemRow = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (returnType === 'Credit') {
                const payload = {
                    credit_note_number: noteNumber,
                    customer_name: partyName,
                    posting_date: postingDate,
                    items: items.map(i => ({
                        item: Number(i.item),
                        quantity: Number(i.quantity),
                        rate: Number(i.rate)
                    }))
                };
                await axios.post('/api/selling/credit-notes/', payload);
                alert('ક્રેડિટ નોટ સફળતાપૂર્વક બની ગઈ છે!');
            } else {
                const payload = {
                    debit_note_number: noteNumber,
                    supplier_name: partyName,
                    posting_date: postingDate,
                    items: items.map(i => ({
                        item: Number(i.item),
                        quantity: Number(i.quantity),
                        rate: Number(i.rate)
                    }))
                };
                await axios.post('/api/buying/debit-notes/', payload);
                alert('ડેબિટ નોટ સફળતાપૂર્વક બની ગઈ છે!');
            }
            setNoteNumber('');
            setPartyName('');
            setPostingDate('');
            setItems([{ item: '', quantity: 1, rate: 0 }]);
        } catch (error: any) {
            console.error('Error saving note:', error);
            alert('નોટ સેવ કરવામાં ભૂલ આવી છે.');
        }
    };

    return (
        <div className="p-6 bg-white rounded shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Credit & Debit Note Management</h2>
            
            <div className="mb-6 flex gap-6 bg-gray-50 p-4 rounded border">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input 
                        type="radio" 
                        name="returnType" 
                        checked={returnType === 'Credit'} 
                        onChange={() => setReturnType('Credit')} 
                    /> Credit Note (Sales Return)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input 
                        type="radio" 
                        name="returnType" 
                        checked={returnType === 'Debit'} 
                        onChange={() => setReturnType('Debit')} 
                    /> Debit Note (Purchase Return)
                </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block font-semibold mb-1">
                            {returnType === 'Credit' ? 'Credit Note No' : 'Debit Note No'}:
                        </label>
                        <input 
                            type="text" 
                            value={noteNumber} 
                            onChange={(e) => setNoteNumber(e.target.value)} 
                            className="border p-2 w-full rounded"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">
                            {returnType === 'Credit' ? 'Customer Name' : 'Supplier Name'}:
                        </label>
                        <input 
                            type="text" 
                            value={partyName} 
                            onChange={(e) => setPartyName(e.target.value)} 
                            className="border p-2 w-full rounded"
                            required 
                        />
                    </div>
                </div>

                <div>
                    <label className="block font-semibold mb-1">Posting Date:</label>
                    <input 
                        type="date" 
                        value={postingDate} 
                        onChange={(e) => setPostingDate(e.target.value)} 
                        className="border p-2 w-full rounded"
                        required 
                    />
                </div>

                <div className="mt-4">
                    <h3 className="font-bold mb-2">Line Items</h3>
                    <table className="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2">Item ID</th>
                                <th className="border p-2">Quantity</th>
                                <th className="border p-2">Rate</th>
                                <th className="border p-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row, index) => (
                                <tr key={index}>
                                    <td className="border p-2">
                                        <input 
                                            type="number" 
                                            placeholder="Item ID" 
                                            value={row.item} 
                                            onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                                            className="w-full p-1 border rounded"
                                            required
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input 
                                            type="number" 
                                            value={row.quantity} 
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-full p-1 border rounded"
                                            required
                                        />
                                    </td>
                                    <td className="border p-2">
                                        <input 
                                            type="number" 
                                            value={row.rate} 
                                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                            className="w-full p-1 border rounded"
                                            required
                                        />
                                    </td>
                                    <td className="border p-2 text-center">
                                        {items.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeItemRow(index)}
                                                className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button 
                        type="button" 
                        onClick={addItemRow} 
                        className="mt-2 bg-gray-200 px-3 py-1 rounded text-sm font-semibold"
                    >
                        + Add Line
                    </button>
                </div>

                <div className="mt-6">
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">
                        Save {returnType} Note
                    </button>
                </div>
            </form>
        </div>
    );
}