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
      <div className="page-header">
        <div>
          <h1>Morning Entry</h1>
          <p className="text-muted">Create a new order for a customer (Quantity only)</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="flex-col gap-6">
          <div className="card">
            <div className="card-header">
              <h2>Select Customer</h2>
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

          <div className="card">
            <div className="card-header">
              <h2>Add Products</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddItem} className="form-row flex-wrap">
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label">Product</label>
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
                <div className="form-group" style={{ width: '120px' }}>
                  <label className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    step="0.01" 
                    min="0.01" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-outline" style={{ height: '38px', marginTop: 'auto' }}>
                  + Add
                </button>
              </form>

              {items.length > 0 && (
                <div className="table-wrapper mt-6">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty / Unit</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{item.productName}</td>
                          <td>{item.quantity} {item.unit}</td>
                          <td className="text-right">
                            <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleRemoveItem(idx)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-2">
            <button className="btn btn-outline" onClick={() => { setSelectedCustomerId(''); setItems([]); }}>Reset</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmitOrder} 
              disabled={isSubmitting || !selectedCustomerId || items.length === 0}
            >
              {isSubmitting ? 'Saving...' : 'Save Morning Entry'}
            </button>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
