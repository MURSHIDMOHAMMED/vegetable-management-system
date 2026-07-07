'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useEffect, useState } from 'react';
import { getBillsLast30Days, getBillsByMonth } from '@/lib/firestore/bills';
import { Bill } from '@/types';
import { format, subDays } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// Build daily chart data for last N days from bills
function buildDailyData(bills: Bill[], days: number) {
  const today = new Date();
  const map: Record<string, { sales: number; collected: number; outstanding: number }> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const key = d.toISOString().split('T')[0];
    map[key] = { sales: 0, collected: 0, outstanding: 0 };
  }

  bills.forEach(b => {
    if (map[b.date]) {
      map[b.date].sales += b.subtotal;
      map[b.date].collected += b.amountPaid;
      map[b.date].outstanding += b.balance;
    }
  });

  return Object.entries(map).map(([date, vals]) => ({
    date,
    label: format(new Date(date + 'T00:00:00'), 'dd MMM'),
    ...vals,
  }));
}

// Build customer breakdown
function buildCustomerData(bills: Bill[]) {
  const map: Record<string, number> = {};
  bills.forEach(b => {
    map[b.customerName] = (map[b.customerName] || 0) + b.subtotal;
  });
  return Object.entries(map)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#3b82f6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border rounded shadow-sm p-3" style={{ fontSize: '13px' }}>
        <p className="fw-bold mb-2 text-dark">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, margin: '2px 0' }}>
            {p.name}: ₹{Number(p.value).toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function SalesChartPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const [activeTab, setActiveTab] = useState<'trend' | 'bar' | 'customers'>('trend');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getBillsLast30Days();
        setBills(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const dailyData = buildDailyData(bills, range);
  const customerData = buildCustomerData(bills);

  const totalSales = bills.reduce((s, b) => s + b.subtotal, 0);
  const totalCollected = bills.reduce((s, b) => s + b.amountPaid, 0);
  const totalOutstanding = bills.reduce((s, b) => s + b.balance, 0);
  const totalBills = bills.length;

  return (
    <AuthGuard>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Sales Chart</h1>
          <p className="text-muted mb-0">Visual breakdown of your sales performance</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-primary border-start border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small fw-semibold text-uppercase mb-1">Total Sales (30d)</div>
              <div className="fs-4 fw-bold text-primary">₹{totalSales.toFixed(0)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-success border-start border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small fw-semibold text-uppercase mb-1">Collected</div>
              <div className="fs-4 fw-bold text-success">₹{totalCollected.toFixed(0)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-warning border-start border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small fw-semibold text-uppercase mb-1">Outstanding</div>
              <div className="fs-4 fw-bold text-warning">₹{totalOutstanding.toFixed(0)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-secondary border-start border-4 h-100">
            <div className="card-body py-3">
              <div className="text-muted small fw-semibold text-uppercase mb-1">Total Bills</div>
              <div className="fs-4 fw-bold">{totalBills}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        {/* Tab bar + Range selector */}
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <ul className="nav nav-pills bg-light p-1 rounded">
            <li className="nav-item">
              <button 
                className={`nav-link px-3 py-1 ${activeTab === 'trend' ? 'active' : 'text-muted'}`} 
                onClick={() => setActiveTab('trend')}
              >
                Area Trend
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link px-3 py-1 ${activeTab === 'bar' ? 'active' : 'text-muted'}`} 
                onClick={() => setActiveTab('bar')}
              >
                Daily Bars
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link px-3 py-1 ${activeTab === 'customers' ? 'active' : 'text-muted'}`} 
                onClick={() => setActiveTab('customers')}
              >
                Top Customers
              </button>
            </li>
          </ul>
          
          <div className="btn-group">
            {([7, 14, 30] as const).map(r => (
              <button
                key={r}
                className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setRange(r)}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        <div className="card-body p-4" style={{ minHeight: '380px' }}>
          {loading ? (
            <div className="d-flex justify-content-center align-items-center h-100" style={{ minHeight: '320px' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48" className="mb-3 opacity-50">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zm7.5-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v10.125C15 20.496 14.496 21 13.875 21h-2.25A1.125 1.125 0 0110.5 19.875V9.75zm7.5-6.375c0-.621.504-1.125 1.125-1.125h2.25C21.496 2.25 22 2.754 22 3.375v16.5C22 20.496 21.496 21 20.875 21h-2.25A1.125 1.125 0 0118 19.875V3.375z" />
              </svg>
              <p>No bills found in the last 30 days. Generate some bills first!</p>
            </div>
          ) : (
            <>
              {activeTab === 'trend' && (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="sales" name="Total Sales" stroke="#6366f1" strokeWidth={2} fill="url(#gradSales)" dot={false} />
                    <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} fill="url(#gradCollected)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'bar' && (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="sales" name="Total Sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'customers' && (
                <div className="row align-items-center">
                  <div className="col-12 col-md-6 mb-4 mb-md-0">
                    <ResponsiveContainer width="100%" height={300} minWidth={260}>
                      <PieChart>
                        <Pie
                          data={customerData}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          innerRadius={55}
                          paddingAngle={3}
                        >
                          {customerData.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [
                            `₹${Number(value ?? 0).toFixed(2)}`,
                            "Sales",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="col-12 col-md-6">
                    <p className="text-muted small fw-semibold mb-4 text-uppercase">Top customers by sales (last 30 days)</p>
                    {customerData.map((c, idx) => (
                      <div key={idx} className="d-flex align-items-center mb-3">
                        <div 
                          className="rounded-circle flex-shrink-0 me-3" 
                          style={{ width: 12, height: 12, background: COLORS[idx % COLORS.length] }} 
                        />
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between mb-1">
                            <span className="fw-medium small">{c.name}</span>
                            <span className="small text-muted fw-semibold">₹{c.total.toFixed(0)}</span>
                          </div>
                          <div className="progress" style={{ height: 4 }}>
                            <div 
                              className="progress-bar" 
                              role="progressbar" 
                              style={{
                                background: COLORS[idx % COLORS.length],
                                width: `${(c.total / customerData[0].total) * 100}%`
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
