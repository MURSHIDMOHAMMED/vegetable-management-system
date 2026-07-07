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
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="text-muted">Overview of your business</p>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="flex-col gap-6">
          <div className="stat-grid">
            <div className="stat-card amber">
              <div className="stat-icon">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 20, height: 20}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stat-label">Pending Orders</div>
              <div className="stat-value">{pendingOrders.length}</div>
            </div>
            
            <div className="stat-card blue">
              <div className="stat-icon">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 20, height: 20}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div className="stat-label">Total Customers</div>
              <div className="stat-value">{customers.length}</div>
            </div>

            <div className="stat-card red">
              <div className="stat-icon">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 20, height: 20}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stat-label">Total Outstanding</div>
              <div className="stat-value">₹{totalOutstanding.toFixed(2)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="card-body form-grid-2">
              <Link href="/morning-entry" className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
                <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>📋</span> New Morning Entry
              </Link>
              <Link href="/pending-orders" className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
                <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>💰</span> Process Billing
              </Link>
              <Link href="/payments" className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
                <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>💵</span> Record Payment
              </Link>
              <Link href="/customers" className="btn btn-outline" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
                <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>👥</span> Manage Customers
              </Link>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
