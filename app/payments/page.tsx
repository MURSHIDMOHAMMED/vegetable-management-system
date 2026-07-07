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
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p className="text-muted">Record payments received from customers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Record Payment
        </button>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="stat-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="stat-card red">
            <div className="stat-label">Total Outstanding</div>
            <div className="stat-value">₹{totalOutstanding.toFixed(2)}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Customers with Balance</div>
            <div className="stat-value">{customers.filter(c => c.balance > 0).length}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2>Outstanding Balances</h2>
          <div className="flex gap-3 items-center">
            <div className="search-bar" style={{ maxWidth: 260, minWidth: 180 }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Show all
            </label>
          </div>
        </div>

        {loading ? (
          <div className="card-body text-center py-8">
            <div className="spinner" />
          </div>
        ) : customersToShow.length === 0 ? (
          <div className="empty-state">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{showAll ? 'No customers found.' : 'No customers have outstanding balances.'}</p>
            {!showAll && (
              <button className="btn btn-outline btn-sm mt-4" onClick={() => setShowAll(true)}>
                Show all customers
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th className="text-right">Balance Due (₹)</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {customersToShow.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-medium">{c.name}</div>
                      {c.shopName && <div className="text-sm text-muted">{c.shopName}</div>}
                    </td>
                    <td>{c.phone || '-'}</td>
                    <td className={`text-right font-medium ${c.balance > 0 ? 'text-danger' : 'text-muted'}`}>
                      ₹{c.balance.toFixed(2)}
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-outline btn-sm"
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
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Customer</label>
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
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Note (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Cash, UPI, Bank Transfer..."
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
            />
          </div>
          <div className="flex justify-between mt-4">
            <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </AuthGuard>
  );
}
