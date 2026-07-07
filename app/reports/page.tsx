'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useState } from 'react';
import { getBillsByDate } from '@/lib/firestore/bills';
import { getPaymentsByDate } from '@/lib/firestore/payments';
import { Bill, Payment } from '@/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReportsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        getBillsByDate(date),
        getPaymentsByDate(date)
      ]);
      setBills(b);
      setPayments(p);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('report-content');
    if (!reportElement) return;

    try {
      const canvas = await html2canvas(reportElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Temporarily show the print-only header for the PDF
      const printOnlyHeaders = reportElement.querySelectorAll('.print-only');
      printOnlyHeaders.forEach((el) => { (el as HTMLElement).style.display = 'block'; });
      
      const newCanvas = await html2canvas(reportElement, { scale: 2 });
      const newImgData = newCanvas.toDataURL('image/png');
      
      // Hide them again
      printOnlyHeaders.forEach((el) => { (el as HTMLElement).style.display = 'none'; });

      pdf.addImage(newImgData, 'PNG', 0, 10, pdfWidth, (newCanvas.height * pdfWidth) / newCanvas.width);
      pdf.save(`VegWholesale_Report_${date}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  const totalBilled = bills.reduce((sum, b) => sum + b.subtotal, 0);
  const totalPaidInBills = bills.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalPaymentsOnly = payments.reduce((sum, p) => sum + p.amount, 0);
  const grandTotalReceived = totalPaidInBills + totalPaymentsOnly;
  const newOutstandingCreated = bills.reduce((sum, b) => sum + b.balance, 0);

  return (
    <AuthGuard>
      <div className="page-header no-print">
        <div>
          <h1>Daily Reports</h1>
          <p className="text-muted">View bills and payments for a specific date</p>
        </div>
      </div>

      <div className="card mb-6 no-print">
        <div className="card-body">
          <form onSubmit={handleSearch} className="form-row flex-wrap">
            <div className="form-group" style={{ width: '200px' }}>
              <label className="form-label">Select Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '38px', marginTop: 'auto' }} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
            {hasSearched && (
              <div className="flex gap-2" style={{ marginTop: 'auto' }}>
                <button type="button" className="btn btn-outline" style={{ height: '38px' }} onClick={handlePrint}>
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width:18, height:18, marginRight:6}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.728 12.551A5.25 5.25 0 0112 7.5h.052l-2.034-2.033a1.125 1.125 0 011.591-1.59l4 4a1.125 1.125 0 010 1.59l-4 4a1.125 1.125 0 01-1.591-1.59l2.034-2.032zM17.272 11.449A5.25 5.25 0 0112 16.5h-.052l2.034 2.033a1.125 1.125 0 01-1.591 1.59l-4-4a1.125 1.125 0 010-1.59l4-4a1.125 1.125 0 011.591 1.59l-2.034 2.032z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Print
                </button>
                <button type="button" className="btn btn-primary" style={{ height: '38px' }} onClick={handleDownloadPdf}>
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width:18, height:18, marginRight:6}}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download PDF
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {hasSearched && !loading && (
        <div className="report-container" id="report-content" style={{ backgroundColor: 'var(--bg)', padding: '10px' }}>
          <div className="print-only mb-4" style={{ display: 'none' }}>
            <h1 style={{ fontSize: '24px', textAlign: 'center' }}>Daily Summary Report</h1>
            <p style={{ textAlign: 'center', marginBottom: '20px' }}>Date: {format(new Date(date), 'dd MMMM yyyy')}</p>
          </div>

          <div className="stat-grid mb-6">
            <div className="stat-card blue">
              <div className="stat-label">Total Billed</div>
              <div className="stat-value">₹{totalBilled.toFixed(2)}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-label">Total Cash Received</div>
              <div className="stat-value">₹{grandTotalReceived.toFixed(2)}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">New Outstanding Created</div>
              <div className="stat-value">₹{newOutstandingCreated.toFixed(2)}</div>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="card">
              <div className="card-header">
                <h2>Bills ({bills.length})</h2>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th className="text-right">Billed</th>
                      <th className="text-right">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-muted">No bills generated today.</td></tr>
                    )}
                    {bills.map(b => (
                      <tr key={b.id}>
                        <td>{b.customerName}</td>
                        <td className="text-right">₹{b.subtotal.toFixed(2)}</td>
                        <td className="text-right text-success">₹{b.amountPaid.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Standalone Payments ({payments.length})</h2>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Note</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-muted">No payments received today.</td></tr>
                    )}
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td>{p.customerName}</td>
                        <td className="text-sm">{p.note || '-'}</td>
                        <td className="text-right text-success font-medium">₹{p.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; margin: 0; }
          .card { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }
        }
      `}} />
    </AuthGuard>
  );
}
