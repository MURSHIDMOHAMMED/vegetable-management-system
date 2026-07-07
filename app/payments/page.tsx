'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Modal from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { getCustomers } from '@/lib/firestore/customers';
import { recordPayment } from '@/lib/firestore/payments';
import { Customer } from '@/types';

export default function PaymentsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ customerId: '', amount: '', note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === formData.customerId);
    if (!customer) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await recordPayment({
        customerId: customer.id,
        customerName: customer.name,
        amount: Number(formData.amount),
        note: formData.note,
        date: today
      });
      alert('Payment recorded successfully!');
      await fetchCustomers();
      setIsModalOpen(false);
      setFormData({ customerId: '', amount: '', note: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentModal = (c: Customer) => {
    setFormData({ customerId: c.id, amount: c.balance > 0 ? c.balance.toString() : '', note: '' });
    setIsModalOpen(true);
  };

  // Show customers with outstanding balance, or all if toggled
  const customersToShow = customers
    .filter(c => showAll || c.balance > 0)
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.shopName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search)
    );

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);

  return (
    <AuthGuard>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Payments</h1>
          <p className="text-muted mb-0">Record payments received from customers</p>
        </div>
        <div className="btn-toolbar mb-2 mb-md-0 mt-3 mt-md-0">
          <button className="btn btn-success" onClick={() => setIsModalOpen(true)}>
            + Record Payment
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <div className="card shadow-sm border-danger border-start border-4 h-100">
              <div className="card-body py-3">
                <div className="text-muted small fw-semibold text-uppercase mb-1">Total Outstanding</div>
                <div className="fs-4 fw-bold text-danger">₹{totalOutstanding.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="card shadow-sm border-warning border-start border-4 h-100">
              <div className="card-body py-3">
                <div className="text-muted small fw-semibold text-uppercase mb-1">Customers with Balance</div>
                <div className="fs-4 fw-bold text-warning">{customers.filter(c => c.balance > 0).length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <h5 className="card-title mb-0 fw-bold">Outstanding Balances</h5>
          <div className="d-flex gap-3 align-items-center">
            <div className="input-group input-group-sm" style={{ maxWidth: '250px' }}>
              <span className="input-group-text bg-light text-muted border-end-0">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0 shadow-none"
                placeholder="Search customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="form-check form-switch mb-0">
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                id="showAllSwitch"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="showAllSwitch">Show all</label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : customersToShow.length === 0 ? (
          <div className="card-body text-center py-5 text-muted">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48" className="mb-3 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mb-0">{showAll ? 'No customers found.' : 'No customers have outstanding balances.'}</p>
            {!showAll && (
              <button className="btn btn-outline-secondary btn-sm mt-3" onClick={() => setShowAll(true)}>
                Show all customers
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th className="text-end">Balance Due (₹)</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {customersToShow.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="fw-semibold">{c.name}</div>
                      {c.shopName && <div className="small text-muted">{c.shopName}</div>}
                    </td>
                    <td>{c.phone || '-'}</td>
                    <td className={`text-end fw-bold ${c.balance > 0 ? 'text-danger' : 'text-muted'}`}>
                      ₹{c.balance.toFixed(2)}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => openPaymentModal(c)}
                      >
                        Receive Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Payment"
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Customer <span className="text-danger">*</span></label>
            <select
              className="form-select"
              value={formData.customerId}
              onChange={e => setFormData({ ...formData, customerId: e.target.value })}
              required
            >
              <option value="">-- Select Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.shopName ? ` — ${c.shopName}` : ''} (Bal: ₹{c.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Amount (₹) <span className="text-danger">*</span></label>
            <input
              type="number"
              className="form-control"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Note (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Cash, UPI, Bank Transfer..."
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
            />
          </div>
          <div className="d-flex justify-content-between pt-3 border-top">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={isSubmitting}>
              {isSubmitting ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</>
              ) : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </AuthGuard>
  );
}
