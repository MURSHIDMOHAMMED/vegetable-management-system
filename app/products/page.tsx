'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Modal from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { getProducts, addProduct, updateProduct, deleteProduct } from '@/lib/firestore/products';
import { Product } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: 'kg' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({ name: product.name, unit: product.unit });
    } else {
      setEditingId(null);
      setFormData({ name: '', unit: 'kg' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateProduct(editingId, formData);
      } else {
        await addProduct(formData);
      }
      await fetchProducts();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to delete product');
    }
  };

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p className="text-muted">Manage your inventory items</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Add Product
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
              placeholder="Search products..." 
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
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p>No products found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Unit</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td><span className="badge badge-gray">{p.unit}</span></td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal(p)}>Edit</button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(p.id)}>Delete</button>
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
        title={editingId ? 'Edit Product' : 'Add Product'}
      >
        <form id="product-form" onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Unit (e.g. kg, box, piece)</label>
            <select 
              className="form-select" 
              value={formData.unit} 
              onChange={e => setFormData({...formData, unit: e.target.value})}
            >
              <option value="kg">kg</option>
              <option value="box">box</option>
              <option value="piece">piece</option>
              <option value="bunch">bunch</option>
              <option value="gram">gram</option>
            </select>
          </div>
          <div className="flex justify-between mt-4">
            <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </AuthGuard>
  );
}
