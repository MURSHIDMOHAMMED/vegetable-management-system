'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useEffect, useState } from 'react';
import { getCustomers } from '@/lib/firestore/customers';
import { getProducts } from '@/lib/firestore/products';
import { addOrder } from '@/lib/firestore/orders';
import { Customer, Product, OrderItem } from '@/types';
import { useRouter } from 'next/navigation';

export default function MorningEntryPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersData, productsData] = await Promise.all([
          getCustomers(),
          getProducts()
        ]);
        setCustomers(customersData);
        setProducts(productsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity) return;
    
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Check if product already added
    const existing = items.find(i => i.productId === selectedProductId);
    if (existing) {
      setItems(items.map(i => i.productId === selectedProductId ? { ...i, quantity: i.quantity + Number(quantity) } : i));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: Number(quantity)
      }]);
    }
    
    setSelectedProductId('');
    setQuantity('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (!selectedCustomerId || items.length === 0) {
      alert('Please select a customer and add at least one product.');
      return;
    }
    
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await addOrder({
        customerId: customer.id,
        customerName: customer.name,
        customerShopName: customer.shopName || '',
        items,
        status: 'pending',
        date: today
      });
      alert('Order saved successfully!');
      // Stay on page and reset form for the next entry
      setSelectedCustomerId('');
      setItems([]);
    } catch (err) {
      console.error(err);
      alert('Failed to save order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Morning Entry</h1>
          <p className="text-muted mb-0">Create a new order for a customer (Quantity only)</p>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 fw-bold">Select Customer</h5>
              </div>
              <div className="card-body">
                <select 
                  className="form-select" 
                  value={selectedCustomerId} 
                  onChange={e => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 fw-bold">Add Products</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddItem} className="row g-3 align-items-end mb-4">
                  <div className="col-12 col-md-6">
                    <label className="form-label text-muted fw-semibold">Product</label>
                    <select 
                      className="form-select" 
                      value={selectedProductId} 
                      onChange={e => setSelectedProductId(e.target.value)}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label text-muted fw-semibold">Quantity</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      step="0.01" 
                      min="0.01" 
                      value={quantity} 
                      onChange={e => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-2">
                    <button type="submit" className="btn btn-outline-secondary w-100">
                      + Add
                    </button>
                  </div>
                </form>

                {items.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover align-middle mb-0">
                      <thead className="table-light text-muted">
                        <tr>
                          <th className="text-uppercase fw-semibold" style={{ fontSize: '0.85rem' }}>Product</th>
                          <th className="text-uppercase fw-semibold" style={{ fontSize: '0.85rem' }}>Qty / Unit</th>
                          <th className="text-end text-uppercase fw-semibold" style={{ fontSize: '0.85rem' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="fw-medium">{item.productName}</td>
                            <td>{item.quantity} {item.unit}</td>
                            <td className="text-end">
                              <button 
                                className="btn btn-sm btn-link text-danger text-decoration-none" 
                                onClick={() => handleRemoveItem(idx)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 d-flex justify-content-end gap-3 mb-5">
            <button className="btn btn-outline-secondary px-4" onClick={() => { setSelectedCustomerId(''); setItems([]); }}>Reset</button>
            <button 
              className="btn btn-success px-4" 
              onClick={handleSubmitOrder} 
              disabled={isSubmitting || !selectedCustomerId || items.length === 0}
            >
              {isSubmitting ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</>
              ) : 'Save Morning Entry'}
            </button>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
