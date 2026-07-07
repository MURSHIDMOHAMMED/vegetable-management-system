'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useEffect, useState, use } from 'react';
import { getCustomer, updateCustomer } from '@/lib/firestore/customers';
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
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCustomerData = async () => {
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

      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setLedger(entries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const handleSyncBalance = async (correctBalance: number) => {
    if (!customer) return;
    try {
      setIsSyncing(true);
      await updateCustomer(customer.id, { balance: correctBalance });
      await fetchCustomerData();
    } catch (err) {
      console.error('Failed to sync balance:', err);
      alert('Failed to sync balance');
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!customer) {
    return (
      <AuthGuard>
        <div className="text-center py-5">
          <p className="text-muted mb-4">Customer not found</p>
          <Link href="/customers" className="btn btn-success">Go Back</Link>
        </div>
      </AuthGuard>
    );
  }

  let calculatedBalance = 0;
  ledger.forEach(entry => {
    if (entry.type === 'bill') {
      calculatedBalance += (entry.data.subtotal - entry.data.amountPaid);
    } else {
      calculatedBalance -= entry.data.amount;
    }
  });

  // Reverse for display (newest first)
  const displayLedger = [...ledger].reverse();
  const balanceMismatch = Math.abs(calculatedBalance - customer.balance) > 0.01;

  return (
    <AuthGuard>
      {/* Page Header */}
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-start pt-3 pb-2 mb-4 border-bottom gap-3">
        <div>
          <Link href="/customers" className="text-muted text-decoration-none d-inline-flex align-items-center mb-2 small">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} className="me-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Customers
          </Link>
          <h1 className="h2 mb-1 fw-bold">{customer.name}</h1>
          <p className="text-muted mb-0">
            {customer.shopName && <><strong>{customer.shopName}</strong> &bull; </>}
            {customer.phone && <>{customer.phone}</>}
            {customer.address && <> &bull; {customer.address}</>}
          </p>
        </div>

        {/* Balance Card */}
        <div className={`card shadow-sm border-start border-4 ${customer.balance > 0 ? 'border-danger' : customer.balance < 0 ? 'border-warning' : 'border-success'}`} style={{ minWidth: '200px' }}>
          <div className="card-body py-3 px-4">
            <div className="text-muted small fw-semibold text-uppercase mb-1">Balance Due to Us</div>
            <div className={`fw-bold fs-3 mb-1 ${customer.balance > 0 ? 'text-danger' : customer.balance < 0 ? 'text-warning' : 'text-success'}`}>
              ₹{customer.balance.toFixed(2)}
            </div>
            <div className="small">
              {customer.balance > 0 ? (
                <span className="text-danger fw-semibold">🔴 Customer owes us</span>
              ) : customer.balance < 0 ? (
                <span className="text-warning fw-semibold">⚠️ Customer overpaid</span>
              ) : (
                <span className="text-success fw-semibold">✅ Fully settled</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {balanceMismatch && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between mb-4 shadow-sm border-warning">
          <div>
            <strong>Data Mismatch Detected:</strong> The stored balance (₹{customer.balance.toFixed(2)}) doesn't match the actual ledger history (₹{calculatedBalance.toFixed(2)}). This usually happens if old records were deleted or edited.
          </div>
          <button 
            className="btn btn-warning fw-bold ms-3" 
            onClick={() => handleSyncBalance(calculatedBalance)}
            disabled={isSyncing}
          >
            {isSyncing ? 'Fixing...' : 'Fix Balance Now'}
          </button>
        </div>
      )}

      <div className="alert alert-light border small mb-4 py-2 px-3">
        <strong>How to read this ledger:</strong>&nbsp;
        <span className="text-danger fw-semibold">Debit</span> = total bill amount &nbsp;|&nbsp;
        <span className="text-success fw-semibold">Credit</span> = cash paid (at billing or via separate payment)
      </div>

      {/* Ledger Table */}
      <div className="card shadow-sm">
        <div className="card-header bg-white py-3">
          <h5 className="card-title mb-0 fw-bold">Ledger History</h5>
        </div>
        {displayLedger.length === 0 ? (
          <div className="card-body text-center py-5 text-muted">
            <p className="mb-0">No bills or payments found for this customer.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th className="text-end text-danger">Debit<br/><small className="fw-normal text-muted">(added to balance)</small></th>
                  <th className="text-end text-success">Credit<br/><small className="fw-normal text-muted">(paid / reduced)</small></th>
                </tr>
              </thead>
              <tbody>
                {displayLedger.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="small text-nowrap">{format(new Date(entry.date), 'dd MMM yyyy, p')}</td>
                    <td>
                      {entry.type === 'bill' ? (
                        <span className="badge bg-warning text-dark">Bill</span>
                      ) : (
                        <span className="badge bg-success">Payment</span>
                      )}
                    </td>
                    <td className="small">
                      {entry.type === 'bill' ? (
                        <div>
                          <div>Bill #{entry.data.id.slice(0,6).toUpperCase()}</div>
                          <div className="text-muted">
                            {entry.data.items.length} items
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div>Payment received</div>
                          {entry.data.note && <div className="text-muted">{entry.data.note}</div>}
                        </div>
                      )}
                    </td>
                    {/* Debit column: show full bill amount */}
                    <td className="text-end fw-semibold text-danger">
                      {entry.type === 'bill' && entry.data.subtotal > 0
                        ? `₹${entry.data.subtotal.toFixed(2)}`
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    {/* Credit column: payments + any upfront payment in bills */}
                    <td className="text-end fw-semibold text-success">
                      {entry.type === 'payment' 
                        ? `₹${entry.data.amount.toFixed(2)}`
                        : (entry.type === 'bill' && entry.data.amountPaid > 0)
                          ? `₹${entry.data.amountPaid.toFixed(2)}`
                          : <span className="text-muted">—</span>
                      }
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
