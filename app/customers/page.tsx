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
    c.phone.includes(search)
  );

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({ name: customer.name, shopName: customer.shopName || '', phone: customer.phone, address: customer.address });
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
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p className="text-muted">Manage your customer list and view balances</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Add Customer
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="search-bar" style={{ maxWidth: '100%' }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search customers by name or phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-body text-center py-8">
            <div className="spinner" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p>No customers found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Shop Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Balance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.shopName || '-'}</td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.address || '-'}</td>
                    <td>
                      <span className={`badge ${c.balance > 0 ? 'badge-red' : c.balance < 0 ? 'badge-green' : 'badge-gray'}`}>
                        ₹{c.balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal(c)}>Edit</button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(c.id)}>Delete</button>
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
        <form id="customer-form" onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Shop Name (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.shopName} 
              onChange={e => setFormData({...formData, shopName: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input 
              type="tel" 
              className="form-input" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea 
              className="form-textarea" 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div className="flex justify-between mt-4">
            <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </AuthGuard>
  );
}
