'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import Modal from '@/components/ui/Modal';
import { useEffect, useState } from 'react';
import { getOrdersByDate, updateOrder, deleteOrder } from '@/lib/firestore/orders';
import { getCustomers } from '@/lib/firestore/customers';
import { getProducts } from '@/lib/firestore/products';
import { Order, OrderItem, Customer, Product } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function DailyOrdersPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [addProductId, setAddProductId] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchOrders = async (d: string) => {
    setLoading(true);
    try {
      const data = await getOrdersByDate(d);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const [c, p] = await Promise.all([getCustomers(), getProducts()]);
      setCustomers(c);
      setProducts(p);
    };
    init();
    fetchOrders(todayStr);
  }, []);

  const handleDateChange = (d: string) => {
    setDate(d);
    fetchOrders(d);
  };

  // ---- Edit ----
  const handleOpenEdit = (order: Order) => {
    if (order.status === 'billed') {
      alert('This order is already billed and cannot be edited.');
      return;
    }
    setEditingOrder(order);
    setEditItems(order.items.map(i => ({ ...i })));
    setEditCustomerId(order.customerId);
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
        quantity: Number(addQuantity)
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
      await fetchOrders(date);
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
    if (order.status === 'billed') {
      alert('This order is already billed and cannot be deleted.');
      return;
    }
    if (!confirm(`Delete order for "${order.customerName}"? This cannot be undone.`)) return;
    try {
      await deleteOrder(order.id);
      await fetchOrders(date);
    } catch (err) {
      console.error(err);
      alert('Failed to delete order.');
    }
  };

  const totalOrders = orders.length;
  const billedCount = orders.filter(o => o.status === 'billed').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1>Daily Orders</h1>
          <p className="text-muted">View, edit and delete orders for any day</p>
        </div>
        <Link href="/morning-entry" className="btn btn-primary">+ New Order</Link>
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
      {!loading && orders.length > 0 && (
        <div className="stat-grid mb-6">
          <div className="stat-card blue">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{totalOrders}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{pendingCount}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Billed</div>
            <div className="stat-value">{billedCount}</div>
          </div>
        </div>
      )}

      {/* Orders table */}
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
            <p>No orders found for {format(new Date(date + 'T00:00:00'), 'dd MMMM yyyy')}.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="text-sm">{format(new Date(order.createdAt), 'hh:mm a')}</td>
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
                    <td>
                      {order.status === 'billed' ? (
                        <span className="badge badge-green">Billed</span>
                      ) : (
                        <span className="badge badge-amber">Pending</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleOpenEdit(order)}
                        disabled={order.status === 'billed'}
                        title={order.status === 'billed' ? 'Already billed' : 'Edit'}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => handleDelete(order)}
                        disabled={order.status === 'billed'}
                        title={order.status === 'billed' ? 'Already billed' : 'Delete'}
                      >
                        Delete
                      </button>
                      {order.status === 'pending' && (
                        <Link href={`/billing/${order.id}`} className="btn btn-outline btn-sm">
                          Bill
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Order"
      >
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
                  {c.name} {c.shopName ? `— ${c.shopName}` : ''}
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
                          <span className="text-sm text-muted ml-1">{item.unit}</span>
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
