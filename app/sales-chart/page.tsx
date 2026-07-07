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
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 16px',
        boxShadow: 'var(--shadow-md)',
        fontSize: 13
      }}>
        <p style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, margin: '2px 0' }}>
            {p.name}: ₹{Number(p.value).toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SalesChartPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const [activeTab, setActiveTab] = useState<'trend' | 'bar' | 'customers'>('trend');

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

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

  const tabStyle = (tab: string) => ({
    padding: '8px 20px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 14,
    background: activeTab === tab ? 'var(--primary)' : 'transparent',
    color: activeTab === tab ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.2s',
  });

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1>Sales Chart</h1>
          <p className="text-muted">Visual breakdown of your sales performance</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid mb-6">
        <div className="stat-card blue">
          <div className="stat-label">Total Sales (30 days)</div>
          <div className="stat-value">₹{totalSales.toFixed(0)}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Collected</div>
          <div className="stat-value">₹{totalCollected.toFixed(0)}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value">₹{totalOutstanding.toFixed(0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Bills</div>
          <div className="stat-value">{totalBills}</div>
        </div>
      </div>

      <div className="card">
        {/* Tab bar + Range selector */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4 }}>
            <button style={tabStyle('trend')} onClick={() => setActiveTab('trend')}>Area Trend</button>
            <button style={tabStyle('bar')} onClick={() => setActiveTab('bar')}>Daily Bars</button>
            <button style={tabStyle('customers')} onClick={() => setActiveTab('customers')}>Top Customers</button>
          </div>
          <div className="flex gap-2">
            {([7, 14, 30] as const).map(r => (
              <button
                key={r}
                className={`btn btn-sm ${range === r ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setRange(r)}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px 16px', minHeight: 380 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
              <div className="spinner" />
            </div>
          ) : bills.length === 0 ? (
            <div className="empty-state">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="sales" name="Total Sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'customers' && (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                  <ResponsiveContainer width={300} height={300} minWidth={260}>
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
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p className="text-muted text-sm mb-4">Top customers by sales (last 30 days)</p>
                    {customerData.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-medium" style={{ fontSize: 13 }}>{c.name}</span>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>₹{c.total.toFixed(0)}</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginTop: 4 }}>
                            <div style={{
                              height: '100%',
                              borderRadius: 4,
                              background: COLORS[idx % COLORS.length],
                              width: `${(c.total / customerData[0].total) * 100}%`
                            }} />
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
