'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useEffect, useState } from 'react';
import { getPendingOrders } from '@/lib/firestore/orders';
import { getCustomers } from '@/lib/firestore/customers';
import { Order, Customer } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, customersData] = await Promise.all([
          getPendingOrders(),
          getCustomers()
        ]);
        setPendingOrders(ordersData);
        setCustomers(customersData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalOutstanding = customers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <AuthGuard>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Dashboard</h1>
          <p className="text-muted mb-0">Overview of your business</p>
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
          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100 border-warning border-start border-4">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-warning bg-opacity-25 p-2 rounded text-warning me-3">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h6 className="card-title text-muted fw-bold mb-0 text-uppercase">Pending Orders</h6>
                </div>
                <h2 className="display-5 fw-bold mb-0 text-dark">{pendingOrders.length}</h2>
              </div>
            </div>
          </div>
          
          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100 border-primary border-start border-4">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-primary bg-opacity-25 p-2 rounded text-primary me-3">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <h6 className="card-title text-muted fw-bold mb-0 text-uppercase">Total Customers</h6>
                </div>
                <h2 className="display-5 fw-bold mb-0 text-dark">{customers.length}</h2>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100 border-danger border-start border-4">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-danger bg-opacity-25 p-2 rounded text-danger me-3">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h6 className="card-title text-muted fw-bold mb-0 text-uppercase">Total Balance Due</h6>
                </div>
                <h2 className="display-5 fw-bold mb-0 text-dark">₹{totalOutstanding.toFixed(2)}</h2>
              </div>
            </div>
          </div>

          <div className="col-12 mt-5">
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="card-title mb-0 fw-bold">Quick Actions</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <Link href="/morning-entry" className="btn btn-outline-secondary w-100 text-start p-3 d-flex align-items-center">
                      <span className="fs-3 me-3">📋</span> 
                      <span className="fw-semibold">New Morning Entry</span>
                    </Link>
                  </div>
                  <div className="col-12 col-md-6">
                    <Link href="/pending-orders" className="btn btn-outline-secondary w-100 text-start p-3 d-flex align-items-center">
                      <span className="fs-3 me-3">💰</span> 
                      <span className="fw-semibold">Process Billing</span>
                    </Link>
                  </div>
                  <div className="col-12 col-md-6">
                    <Link href="/payments" className="btn btn-outline-secondary w-100 text-start p-3 d-flex align-items-center">
                      <span className="fs-3 me-3">💵</span> 
                      <span className="fw-semibold">Record Payment</span>
                    </Link>
                  </div>
                  <div className="col-12 col-md-6">
                    <Link href="/customers" className="btn btn-outline-secondary w-100 text-start p-3 d-flex align-items-center">
                      <span className="fs-3 me-3">👥</span> 
                      <span className="fw-semibold">Manage Customers</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
