'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Modal from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '@/lib/firestore/customers';
import { Customer } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', shopName: '', phone: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
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

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({ name: customer.name, shopName: customer.shopName || '', phone: customer.phone || '', address: customer.address || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', shopName: '', phone: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateCustomer(editingId, formData);
      } else {
        await addCustomer(formData);
      }
      await fetchCustomers();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await deleteCustomer(id);
      await fetchCustomers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete customer');
    }
  };

  return (
    <AuthGuard>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Customers</h1>
          <p className="text-muted mb-0">Manage your customer list and view balances</p>
        </div>
        <div className="btn-toolbar mb-2 mb-md-0 mt-3 mt-md-0">
          <button className="btn btn-success" onClick={() => handleOpenModal()}>
            + Add Customer
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="input-group">
            <span className="input-group-text bg-white text-muted border-end-0">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input 
              type="text" 
              className="form-control border-start-0 ps-0 shadow-none" 
              placeholder="Search customers by name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        {loading ? (
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="card-body text-center py-5 text-muted">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48" className="mb-3 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="mb-0">No customers found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Shop Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Balance</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.name}</td>
                    <td>{c.shopName || <span className="text-muted">-</span>}</td>
                    <td>{c.phone || <span className="text-muted">-</span>}</td>
                    <td>
                      <span className="d-inline-block text-truncate" style={{ maxWidth: '150px' }}>
                        {c.address || <span className="text-muted">-</span>}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.balance > 0 ? 'bg-danger' : c.balance < 0 ? 'bg-success' : 'bg-secondary'}`}>
                        ₹{c.balance.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleOpenModal(c)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                      </div>
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
        title={editingId ? 'Edit Customer' : 'Add Customer'}
      >
        <form id="customer-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
            <input 
              type="text" 
              className="form-control" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              required 
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Shop Name (Optional)</label>
            <input 
              type="text" 
              className="form-control" 
              value={formData.shopName} 
              onChange={e => setFormData({...formData, shopName: e.target.value})}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Phone</label>
            <input 
              type="tel" 
              className="form-control" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Address</label>
            <textarea 
              className="form-control" 
              rows={3}
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div className="d-flex justify-content-between pt-3 border-top">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={isSubmitting}>
              {isSubmitting ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</>
              ) : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </AuthGuard>
  );
}
