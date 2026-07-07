'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Modal from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { getBillsByDate, updateBill, deleteBill } from '@/lib/firestore/bills';
import { Bill, BillItem } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function DailyBillsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editItems, setEditItems] = useState<BillItem[]>([]);
  const [editAmountPaid, setEditAmountPaid] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchBills = async (d: string) => {
    setLoading(true);
    try {
      const data = await getBillsByDate(d);
      setBills(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(todayStr);
  }, []);

  const handleDateChange = (d: string) => {
    setDate(d);
    fetchBills(d);
  };

  // ---- Edit ----
  const handleOpenEdit = (bill: Bill) => {
    setEditingBill(bill);
    setEditItems(bill.items.map(i => ({ ...i })));
    setEditAmountPaid(bill.amountPaid.toString());
    setIsModalOpen(true);
  };

  const handlePriceChange = (idx: number, val: string) => {
    const newItems = [...editItems];
    newItems[idx].price = Number(val);
    newItems[idx].total = newItems[idx].quantity * Number(val);
    setEditItems(newItems);
  };

  const editSubtotal = editItems.reduce((s, i) => s + i.total, 0);
  const editPaid = Number(editAmountPaid) || 0;
  const editBalance = editSubtotal - editPaid;

  const handleSaveEdit = async () => {
    if (!editingBill) return;
    setIsSaving(true);
    try {
      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (editPaid >= editSubtotal && editSubtotal > 0) status = 'paid';
      else if (editPaid > 0) status = 'partial';

      await updateBill(editingBill.id, {
        items: editItems,
        subtotal: editSubtotal,
        amountPaid: editPaid,
        balance: editBalance,
        status,
      });
      await fetchBills(date);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update bill.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (bill: Bill) => {
    if (!confirm(
      `Delete bill for "${bill.customerName}"?\n\n` +
      `This will:\n• Reverse ₹${bill.balance.toFixed(2)} from their balance\n• Move the order back to Pending\n\nThis cannot be undone.`
    )) return;
    try {
      await deleteBill(bill.id);
      await fetchBills(date);
    } catch (err) {
      console.error(err);
      alert('Failed to delete bill.');
    }
  };

  const totalSales = bills.reduce((s, b) => s + b.subtotal, 0);
  const totalCollected = bills.reduce((s, b) => s + b.amountPaid, 0);
  const totalPending = bills.reduce((s, b) => s + b.balance, 0);

  const statusBadge = (status: string) => {
    if (status === 'paid') return <span className="badge badge-green">Paid</span>;
    if (status === 'partial') return <span className="badge badge-amber">Partial</span>;
    return <span className="badge badge-red">Unpaid</span>;
  };

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1>Daily Bills</h1>
          <p className="text-muted">View, edit and delete generated bills for any day</p>
        </div>
        <Link href="/pending-orders" className="btn btn-primary">+ New Bill</Link>
      </div>

      {/* Date picker */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="form-row">
            <div className="form-group" style={{ width: '220px' }}>
              <label className="form-label">Select Date</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={e => handleDateChange(e.target.value)}
              />
            </div>
            <button
              className="btn btn-outline btn-sm"
              style={{ height: '38px', marginTop: 'auto' }}
              onClick={() => handleDateChange(todayStr)}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!loading && bills.length > 0 && (
        <div className="stat-grid mb-6">
          <div className="stat-card blue">
            <div className="stat-label">Total Billed</div>
            <div className="stat-value">₹{totalSales.toFixed(2)}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Collected</div>
            <div className="stat-value">₹{totalCollected.toFixed(2)}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Outstanding</div>
            <div className="stat-value">₹{totalPending.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bills Count</div>
            <div className="stat-value">{bills.length}</div>
          </div>
        </div>
      )}

      {/* Bills table */}
      <div className="card">
        {loading ? (
          <div className="card-body text-center py-8">
            <div className="spinner" />
          </div>
        ) : bills.length === 0 ? (
          <div className="empty-state">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p>No bills found for {format(new Date(date + 'T00:00:00'), 'dd MMMM yyyy')}.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Items</th>
                  <th className="text-right">Subtotal</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Balance</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id}>
                    <td>
                      <div className="font-medium">{bill.customerName}</div>
                      <div className="text-sm text-muted">#{bill.id.slice(0, 6).toUpperCase()}</div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {bill.items.map((item, i) => (
                          <span key={i} className="badge badge-gray" style={{ marginRight: 4, marginBottom: 4 }}>
                            {item.productName} {item.quantity}{item.unit}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-right font-medium">₹{bill.subtotal.toFixed(2)}</td>
                    <td className="text-right text-success">₹{bill.amountPaid.toFixed(2)}</td>
                    <td className="text-right text-danger">₹{bill.balance.toFixed(2)}</td>
                    <td>{statusBadge(bill.status)}</td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleOpenEdit(bill)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => handleDelete(bill)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Edit Bill — ${editingBill?.customerName}`}>
        <div className="form-grid">
          {/* Items prices */}
          <div className="form-group">
            <label className="form-label">Edit Item Prices</label>
            <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Rate (₹)</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.productName}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ padding: '0.2rem 0.4rem', width: 90 }}
                          value={item.price || ''}
                          min="0"
                          step="0.01"
                          onChange={e => handlePriceChange(idx, e.target.value)}
                        />
                      </td>
                      <td className="text-right font-medium">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="card" style={{ background: 'var(--bg-hover)', margin: 0 }}>
            <div className="card-body flex-col gap-2" style={{ fontSize: 14 }}>
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-bold">₹{editSubtotal.toFixed(2)}</span>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Amount Paid (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="0.01"
                  value={editAmountPaid}
                  onChange={e => setEditAmountPaid(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button className="btn btn-outline btn-sm" onClick={() => setEditAmountPaid(editSubtotal.toString())}>Paid Full</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditAmountPaid('0')}>Unpaid</button>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div className="flex justify-between font-bold">
                <span className={editBalance > 0 ? 'text-danger' : 'text-success'}>Net Balance</span>
                <span className={editBalance > 0 ? 'text-danger' : 'text-success'}>₹{editBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  );
}
