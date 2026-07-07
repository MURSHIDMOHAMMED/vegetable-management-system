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
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Pending Orders</h1>
          <p className="text-muted mb-0">Orders waiting for pricing and billing</p>
        </div>
        <div className="btn-toolbar mb-2 mb-md-0 mt-3 mt-md-0">
          <Link href="/morning-entry" className="btn btn-success">
            + New Order
          </Link>
        </div>
      </div>

      <div className="card shadow-sm">
        {loading ? (
          <div className="card-body text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="card-body text-center py-5 text-muted">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48" className="mb-3 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mb-0">No pending orders found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="small text-nowrap">{format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</td>
                    <td>
                      <div className="fw-semibold">{order.customerName}</div>
                      {order.customerShopName && (
                        <div className="small text-muted">{order.customerShopName}</div>
                      )}
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {order.items.map((item, i) => (
                          <span key={i} className="badge bg-secondary">
                            {item.productName} &times; {item.quantity}{item.unit}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleOpenEdit(order)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(order)}
                        >
                          Delete
                        </button>
                        <Link href={`/billing/${order.id}`} className="btn btn-sm btn-success">
                          Process Bill
                        </Link>
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Order">
        <div className="mb-3">
          <label className="form-label fw-semibold">Customer</label>
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

        <div className="mb-3">
          <label className="form-label fw-semibold">Items</label>
          {editItems.length > 0 && (
            <div className="table-responsive mb-3 border rounded">
              <table className="table table-sm table-borderless mb-0">
                <thead className="table-light border-bottom">
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th className="text-end">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="align-middle">{item.productName}</td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center gap-1">
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: '80px' }}
                            value={item.quantity}
                            min="0.01"
                            step="0.01"
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx].quantity = Number(e.target.value);
                              setEditItems(newItems);
                            }}
                          />
                          <span className="small text-muted">{item.unit}</span>
                        </div>
                      </td>
                      <td className="text-end align-middle">
                        <button className="btn btn-sm btn-link text-danger text-decoration-none p-0" onClick={() => handleRemoveEditItem(idx)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={handleAddEditItem} className="row g-2 align-items-end">
            <div className="col-12 col-sm-6">
              <select
                className="form-select form-select-sm"
                value={addProductId}
                onChange={e => setAddProductId(e.target.value)}
              >
                <option value="">+ Add Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                ))}
              </select>
            </div>
            <div className="col-7 col-sm-3">
              <input
                type="number"
                className="form-control form-control-sm"
                value={addQuantity}
                min="0.01"
                step="0.01"
                placeholder="Qty"
                onChange={e => setAddQuantity(e.target.value)}
              />
            </div>
            <div className="col-5 col-sm-3">
              <button type="submit" className="btn btn-outline-secondary btn-sm w-100">Add</button>
            </div>
          </form>
        </div>

        <div className="d-flex justify-content-between mt-4 pt-3 border-top">
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
