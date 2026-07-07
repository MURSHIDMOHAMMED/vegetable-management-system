'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useEffect, useState, use } from 'react';
import { getCustomer } from '@/lib/firestore/customers';
import { getBillsByCustomer } from '@/lib/firestore/bills';
import { getPaymentsByCustomer } from '@/lib/firestore/payments';
import { Customer, LedgerEntry } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custData, billsData, paymentsData] = await Promise.all([
          getCustomer(id),
          getBillsByCustomer(id),
          getPaymentsByCustomer(id)
        ]);
        
        setCustomer(custData);

        const entries: LedgerEntry[] = [
          ...billsData.map(b => ({ type: 'bill' as const, date: b.createdAt.toISOString(), data: b })),
          ...paymentsData.map(p => ({ type: 'payment' as const, date: p.createdAt.toISOString(), data: p }))
        ];

        // Sort ascending by date for running balance calculation
        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setLedger(entries);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner" />
        </div>
      </AuthGuard>
    );
  }

  if (!customer) {
    return (
      <AuthGuard>
        <div className="empty-state">
          <p>Customer not found</p>
          <Link href="/customers" className="btn btn-primary mt-4">Go Back</Link>
        </div>
      </AuthGuard>
    );
  }

  // Calculate running balance for display
  let currentBalance = 0;
  const ledgerWithBalance = ledger.map(entry => {
    if (entry.type === 'bill') {
      const unpaid = entry.data.subtotal - entry.data.amountPaid;
      currentBalance += unpaid;
    } else {
      currentBalance -= entry.data.amount;
    }
    return { ...entry, runningBalance: currentBalance };
  });
  
  // Reverse for display (newest first)
  ledgerWithBalance.reverse();

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/customers" className="text-muted" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 16, height: 16, marginRight: 4}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </Link>
          </div>
          <h1>{customer.name}</h1>
          <p className="text-muted">{customer.phone} • {customer.address}</p>
        </div>
        <div className="stat-card" style={{ padding: '0.75rem 1.25rem' }}>
          <div className="stat-label mb-1">Current Balance</div>
          <div className={`stat-value ${customer.balance > 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: '1.25rem' }}>
            ₹{customer.balance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Ledger History</h2>
        </div>
        {ledgerWithBalance.length === 0 ? (
          <div className="empty-state">
            <p>No bills or payments found for this customer.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th className="text-right">Debit (Bill)</th>
                  <th className="text-right">Credit (Paid)</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerWithBalance.map((entry, idx) => (
                  <tr key={idx}>
                    <td>{format(new Date(entry.date), 'dd MMM yyyy, p')}</td>
                    <td>
                      {entry.type === 'bill' ? (
                        <span className="badge badge-amber">Bill</span>
                      ) : (
                        <span className="badge badge-green">Payment</span>
                      )}
                    </td>
                    <td className="text-sm">
                      {entry.type === 'bill' ? (
                        `Bill #${entry.data.id.slice(0,6)} (${entry.data.items.length} items)`
                      ) : (
                        `Payment ${entry.data.note ? `- ${entry.data.note}` : ''}`
                      )}
                    </td>
                    <td className="text-right text-danger">
                      {entry.type === 'bill' ? `₹${(entry.data.subtotal - entry.data.amountPaid).toFixed(2)}` : '-'}
                    </td>
                    <td className="text-right text-success">
                      {entry.type === 'payment' ? `₹${entry.data.amount.toFixed(2)}` : (entry.data.amountPaid > 0 ? `₹${entry.data.amountPaid.toFixed(2)}` : '-')}
                    </td>
                    <td className="text-right font-medium">
                      ₹{entry.runningBalance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
