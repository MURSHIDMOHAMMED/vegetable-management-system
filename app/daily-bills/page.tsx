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
    if (status === 'paid') return <span className="badge bg-success">Paid</span>;
    if (status === 'partial') return <span className="badge bg-warning text-dark">Partial</span>;
    return <span className="badge bg-danger">Unpaid</span>;
  };

  return (
    <AuthGuard>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Daily Bills</h1>
          <p className="text-muted mb-0">View, edit and delete generated bills for any day</p>
        </div>
        <div className="btn-toolbar mb-2 mb-md-0 mt-3 mt-md-0">
          <Link href="/pending-orders" className="btn btn-success">
            + New Bill
          </Link>
        </div>
      </div>

      {/* Date picker */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex align-items-end gap-2 flex-wrap">
            <div style={{ width: '220px' }}>
              <label className="form-label fw-semibold text-muted mb-1">Select Date</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={e => handleDateChange(e.target.value)}
              />
            </div>
            <button
              className="btn btn-outline-secondary"
              onClick={() => handleDateChange(todayStr)}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!loading && bills.length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card shadow-sm border-info border-start border-4 h-100">
              <div className="card-body py-3">
                <div className="text-muted small fw-semibold text-uppercase mb-1">Total Billed</div>
                <div className="fs-4 fw-bold">₹{totalSales.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card shadow-sm border-success border-start border-4 h-100">
              <div className="card-body py-3">
                <div className="text-muted small fw-semibold text-uppercase mb-1">Collected</div>
                <div className="fs-4 fw-bold text-success">₹{totalCollected.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card shadow-sm border-warning border-start border-4 h-100">
              <div className="card-body py-3">
                <div className="text-muted small fw-semibold text-uppercase mb-1">Outstanding</div>
                <div className="fs-4 fw-bold text-danger">₹{totalPending.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card shadow-sm border-secondary border-start border-4 h-100">
              <div className="card-body py-3">
                <div className="text-muted small fw-semibold text-uppercase mb-1">Bills Count</div>
                <div className="fs-4 fw-bold">{bills.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bills table */}
      <div className="card shadow-sm">
        {loading ? (
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : bills.length === 0 ? (
          <div className="card-body text-center py-5 text-muted">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48" className="mb-3 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="mb-0">No bills found for {format(new Date(date + 'T00:00:00'), 'dd MMMM yyyy')}.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Customer</th>
                  <th>Items</th>
                  <th className="text-end">Subtotal</th>
                  <th className="text-end">Paid</th>
                  <th className="text-end">Balance</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id}>
                    <td>
                      <div className="fw-semibold">{bill.customerName}</div>
                      <div className="small text-muted">#{bill.id.slice(0, 6).toUpperCase()}</div>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {bill.items.map((item, i) => (
                          <span key={i} className="badge bg-secondary">
                            {item.productName} {item.quantity}{item.unit}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-end fw-medium">₹{bill.subtotal.toFixed(2)}</td>
                    <td className="text-end text-success">₹{bill.amountPaid.toFixed(2)}</td>
                    <td className="text-end text-danger">₹{bill.balance.toFixed(2)}</td>
                    <td>{statusBadge(bill.status)}</td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleOpenEdit(bill)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(bill)}
                        >
                          Delete
                        </button>
                      </div>
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
        {/* Items prices */}
        <div className="mb-3">
          <label className="form-label fw-semibold">Edit Item Prices</label>
          <div className="table-responsive border rounded">
            <table className="table table-sm table-borderless mb-0">
              <thead className="table-light border-bottom">
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Rate (₹)</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {editItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="align-middle">{item.productName}</td>
                    <td className="align-middle">{item.quantity} {item.unit}</td>
                    <td className="align-middle">
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: '90px' }}
                        value={item.price || ''}
                        min="0"
                        step="0.01"
                        onChange={e => handlePriceChange(idx, e.target.value)}
                      />
                    </td>
                    <td className="text-end align-middle fw-medium">₹{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="card bg-light border-0 mb-4">
          <div className="card-body py-2">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Subtotal</span>
              <span className="fw-bold">₹{editSubtotal.toFixed(2)}</span>
            </div>
            <div className="mb-3">
              <label className="form-label text-muted mb-1 small">Amount Paid (₹)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                min="0"
                step="0.01"
                value={editAmountPaid}
                onChange={e => setEditAmountPaid(e.target.value)}
              />
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditAmountPaid(editSubtotal.toString())}>Paid Full</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditAmountPaid('0')}>Unpaid</button>
              </div>
            </div>
            <hr className="my-2 text-muted" />
            <div className="d-flex justify-content-between fw-bold">
              <span className={editBalance > 0 ? 'text-danger' : 'text-success'}>Net Balance</span>
              <span className={editBalance > 0 ? 'text-danger' : 'text-success'}>₹{editBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between">
          <button className="btn btn-outline-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
          <button className="btn btn-success" onClick={handleSaveEdit} disabled={isSaving}>
            {isSaving ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</>
            ) : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </AuthGuard>
  );
}
