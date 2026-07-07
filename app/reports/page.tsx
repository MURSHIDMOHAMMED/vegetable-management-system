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
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom no-print">
        <div>
          <h1 className="h2 mb-1 fw-bold">Daily Reports</h1>
          <p className="text-muted mb-0">View bills and payments for a specific date</p>
        </div>
      </div>

      <div className="card shadow-sm mb-4 no-print">
        <div className="card-body">
          <form onSubmit={handleSearch} className="d-flex align-items-end gap-3 flex-wrap">
            <div style={{ width: '220px' }}>
              <label className="form-label fw-semibold text-muted mb-1">Select Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...</>
                ) : 'Generate Report'}
              </button>
            </div>
            {hasSearched && (
              <div className="ms-auto d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={handlePrint}>
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18" className="me-2 d-inline-block align-text-bottom">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.728 12.551A5.25 5.25 0 0112 7.5h.052l-2.034-2.033a1.125 1.125 0 011.591-1.59l4 4a1.125 1.125 0 010 1.59l-4 4a1.125 1.125 0 01-1.591-1.59l2.034-2.032zM17.272 11.449A5.25 5.25 0 0112 16.5h-.052l2.034 2.033a1.125 1.125 0 01-1.591 1.59l-4-4a1.125 1.125 0 010-1.59l4-4a1.125 1.125 0 011.591 1.59l-2.034 2.032z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Print
                </button>
                <button type="button" className="btn btn-outline-primary" onClick={handleDownloadPdf}>
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18" className="me-2 d-inline-block align-text-bottom">
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
        <div id="report-content" className="bg-white p-4 rounded shadow-sm">
          <div className="print-only mb-4" style={{ display: 'none' }}>
            <h1 className="text-center fw-bold h3 mb-2">Daily Summary Report</h1>
            <p className="text-center text-muted mb-4">Date: {format(new Date(date), 'dd MMMM yyyy')}</p>
          </div>

          <div className="row g-3 mb-5">
            <div className="col-12 col-md-4">
              <div className="card border-info border-start border-4 h-100 shadow-sm bg-light">
                <div className="card-body">
                  <div className="text-muted small fw-semibold text-uppercase mb-1">Total Billed</div>
                  <div className="fs-4 fw-bold text-info">₹{totalBilled.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card border-success border-start border-4 h-100 shadow-sm bg-light">
                <div className="card-body">
                  <div className="text-muted small fw-semibold text-uppercase mb-1">Total Cash Received</div>
                  <div className="fs-4 fw-bold text-success">₹{grandTotalReceived.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card border-warning border-start border-4 h-100 shadow-sm bg-light">
                <div className="card-body">
                  <div className="text-muted small fw-semibold text-uppercase mb-1">New Outstanding Created</div>
                  <div className="fs-4 fw-bold text-warning">₹{newOutstandingCreated.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-header bg-white py-3 border-bottom-0">
                  <h5 className="card-title mb-0 fw-bold">Bills ({bills.length})</h5>
                </div>
                <div className="table-responsive border-top">
                  <table className="table table-striped table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Customer</th>
                        <th className="text-end">Billed</th>
                        <th className="text-end">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.length === 0 && (
                        <tr><td colSpan={3} className="text-center text-muted py-4">No bills generated today.</td></tr>
                      )}
                      {bills.map(b => (
                        <tr key={b.id}>
                          <td className="fw-medium">{b.customerName}</td>
                          <td className="text-end">₹{b.subtotal.toFixed(2)}</td>
                          <td className="text-end text-success fw-medium">₹{b.amountPaid.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card shadow-sm h-100 border-0">
                <div className="card-header bg-white py-3 border-bottom-0">
                  <h5 className="card-title mb-0 fw-bold">Standalone Payments ({payments.length})</h5>
                </div>
                <div className="table-responsive border-top">
                  <table className="table table-striped table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Customer</th>
                        <th>Note</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 && (
                        <tr><td colSpan={3} className="text-center text-muted py-4">No payments received today.</td></tr>
                      )}
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td className="fw-medium">{p.customerName}</td>
                          <td className="small text-muted">{p.note || '-'}</td>
                          <td className="text-end text-success fw-bold">₹{p.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
          .card { box-shadow: none !important; border: 1px solid #dee2e6 !important; break-inside: avoid; }
          .shadow-sm { box-shadow: none !important; }
        }
      `}} />
    </AuthGuard>
  );
}
