'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Modal from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { getPendingOrders, updateOrder, deleteOrder } from '@/lib/firestore/orders';
import { getCustomers } from '@/lib/firestore/customers';
import { getProducts } from '@/lib/firestore/products';
import { Order, OrderItem, Customer, Product } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [addProductId, setAddProductId] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ordersData, customersData, productsData] = await Promise.all([
        getPendingOrders(),
        getCustomers(),
        getProducts(),
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ---- Edit ----
  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setEditCustomerId(order.customerId);
    setEditItems(order.items.map(i => ({ ...i })));
    setAddProductId('');
    setAddQuantity('');
    setIsModalOpen(true);
  };

  const handleAddEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addProductId || !addQuantity) return;
    const product = products.find(p => p.id === addProductId);
    if (!product) return;

    const existing = editItems.find(i => i.productId === addProductId);
    if (existing) {
      setEditItems(editItems.map(i =>
        i.productId === addProductId ? { ...i, quantity: i.quantity + Number(addQuantity) } : i
      ));
    } else {
      setEditItems([...editItems, {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: Number(addQuantity),
      }]);
    }
    setAddProductId('');
    setAddQuantity('');
  };

  const handleRemoveEditItem = (idx: number) => {
    setEditItems(editItems.filter((_, i) => i !== idx));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      alert('Order must have at least one product.');
      return;
    }
    const customer = customers.find(c => c.id === editCustomerId);
    if (!customer) return;

    setIsSaving(true);
    try {
      await updateOrder(editingOrder.id, {
        customerId: customer.id,
        customerName: customer.name,
        customerShopName: customer.shopName || '',
        items: editItems,
      });
      await fetchAll();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update order.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (order: Order) => {
    if (!confirm(`Delete order for "${order.customerName}"? This cannot be undone.`)) return;
    try {
      await deleteOrder(order.id);
      await fetchAll();
    } catch (err) {
      console.error(err);
      alert('Failed to delete order.');
    }
  };

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1>Pending Orders</h1>
          <p className="text-muted">Orders waiting for pricing and billing</p>
        </div>
        <Link href="/morning-entry" className="btn btn-primary">
          + New Order
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-body text-center py-8">
            <div className="spinner" />
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No pending orders found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="text-sm">{format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</td>
                    <td>
                      <div className="font-medium">{order.customerName}</div>
                      {order.customerShopName && (
                        <div className="text-sm text-muted">{order.customerShopName}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">
                        {order.items.map((item, i) => (
                          <span key={i} className="badge badge-gray" style={{ marginRight: 4, marginBottom: 4 }}>
                            {item.productName} × {item.quantity}{item.unit}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleOpenEdit(order)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => handleDelete(order)}
                      >
                        Delete
                      </button>
                      <Link href={`/billing/${order.id}`} className="btn btn-outline btn-sm">
                        Process Bill
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Order">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Customer</label>
            <select
              className="form-select"
              value={editCustomerId}
              onChange={e => setEditCustomerId(e.target.value)}
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.shopName ? ` — ${c.shopName}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Items</label>
            {editItems.length > 0 && (
              <div className="table-wrapper mb-4" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th className="text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.productName}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '0.2rem 0.4rem', width: 80 }}
                            value={item.quantity}
                            min="0.01"
                            step="0.01"
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx].quantity = Number(e.target.value);
                              setEditItems(newItems);
                            }}
                          />
                          <span className="text-sm text-muted" style={{ marginLeft: 4 }}>{item.unit}</span>
                        </td>
                        <td className="text-right">
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleRemoveEditItem(idx)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form onSubmit={handleAddEditItem} className="form-row" style={{ gap: 8 }}>
              <select
                className="form-select"
                style={{ flex: 1 }}
                value={addProductId}
                onChange={e => setAddProductId(e.target.value)}
              >
                <option value="">+ Add Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                ))}
              </select>
              <input
                type="number"
                className="form-input"
                style={{ width: 90 }}
                value={addQuantity}
                min="0.01"
                step="0.01"
                placeholder="Qty"
                onChange={e => setAddQuantity(e.target.value)}
              />
              <button type="submit" className="btn btn-outline" style={{ height: 38 }}>Add</button>
            </form>
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
