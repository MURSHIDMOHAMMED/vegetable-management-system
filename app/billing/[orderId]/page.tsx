'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { useEffect, useState, use } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createBill } from '@/lib/firestore/bills';
import { getSettings } from '@/lib/firestore/settings';
import { Order, BillItem, ShopSettings, Customer } from '@/types';
import { getCustomer } from '@/lib/firestore/customers';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function BillingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [items, setItems] = useState<BillItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billGenerated, setBillGenerated] = useState(false);
  const [generatedBillId, setGeneratedBillId] = useState<string>('');

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, 'orders', orderId));
        if (snap.exists()) {
          const data = snap.data();
          const ord: Order = {
            id: snap.id,
            customerId: data.customerId,
            customerName: data.customerName,
            items: data.items,
            status: data.status,
            date: data.date,
            createdAt: data.createdAt?.toDate() ?? new Date()
          };
          setOrder(ord);
          // Initialize bill items with 0 price
          setItems(ord.items.map(i => ({ ...i, price: 0, total: 0 })));
          
          try {
            const custData = await getCustomer(data.customerId);
            setCustomer(custData);
          } catch (e) {
            console.error('Could not fetch customer details', e);
          }
        }
        const s = await getSettings();
        setSettings(s);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [orderId]);

  const handlePriceChange = (index: number, priceStr: string) => {
    const price = Number(priceStr);
    const newItems = [...items];
    newItems[index].price = price;
    newItems[index].total = newItems[index].quantity * price;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const paid = amountPaid === '' ? 0 : Number(amountPaid);
  const balance = subtotal - paid;

  const handleSubmit = async () => {
    if (!order) return;
    
    // Validate prices
    if (items.some(i => i.price <= 0)) {
      if (!confirm('Some items have 0 price. Do you want to continue?')) return;
    }

    setIsSubmitting(true);
    try {
      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (paid >= subtotal && subtotal > 0) status = 'paid';
      else if (paid > 0) status = 'partial';

      const billId = await createBill({
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        date: new Date().toISOString().split('T')[0],
        items,
        subtotal,
        amountPaid: paid,
        balance,
        status
      });

      setGeneratedBillId(billId);
      setBillGenerated(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const reportElement = document.getElementById('thermal-bill');
    if (!reportElement) return;

    try {
      // Temporarily set display block to capture it if it's hidden
      reportElement.style.display = 'block';
      const canvas = await html2canvas(reportElement, { scale: 2 });
      reportElement.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      
      // Use A5 or a custom smaller size for the thermal bill ratio
      const pdf = new jsPDF('p', 'mm', [80, 200]); 
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 5, pdfWidth, pdfHeight);
      pdf.save(`Bill_${order?.customerName}_${format(new Date(), 'dd-MM-yy')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  const handleSendWhatsApp = () => {
    if (!customer?.phone) {
      alert("No phone number found for this customer. Please update their profile.");
      return;
    }
    
    const shopName = settings?.shopName || 'Vegetable Wholesale';
    
    let message = `*${shopName}*\n`;
    message += `Bill No: ${generatedBillId.slice(0, 8).toUpperCase()}\n`;
    message += `Date: ${format(new Date(), 'dd/MM/yy')}\n`;
    message += `Customer: ${order?.customerName}\n\n`;
    
    message += `*Items:*\n`;
    items.forEach(item => {
      message += `- ${item.productName}: ${item.quantity}${item.unit} x ₹${item.price} = ₹${item.total}\n`;
    });
    
    message += `\n*Subtotal:* ₹${subtotal.toFixed(2)}\n`;
    if (paid > 0) message += `*Paid:* ₹${paid.toFixed(2)}\n`;
    message += `*Balance added:* ₹${balance.toFixed(2)}\n\n`;
    message += `Thank you for your business!`;

    const encodedMessage = encodeURIComponent(message);
    let phone = customer.phone.replace(/\\D/g, ''); 
    // Add country code if missing (assuming India 91)
    if (phone.length === 10) phone = '91' + phone;

    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="d-flex justify-content-center align-items-center h-100" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!order) {
    return (
      <AuthGuard>
        <div className="text-center py-5">
          <p className="text-muted mb-4">Order not found</p>
          <button className="btn btn-success" onClick={() => router.push('/pending-orders')}>Go Back</button>
        </div>
      </AuthGuard>
    );
  }

  if (billGenerated) {
    return (
      <AuthGuard>
        <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom no-print">
          <h1 className="h2 mb-1 fw-bold text-success">Bill Generated Successfully</h1>
        </div>
        
        <div className="card shadow-sm mb-4 no-print border-success border-start border-4">
          <div className="card-body text-center py-5">
            <div className="bg-success bg-opacity-10 text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="40" height="40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="h4 fw-bold mb-2">Bill for {order.customerName}</h2>
            <p className="text-muted mb-4">Subtotal: <span className="fw-semibold text-dark">₹{subtotal.toFixed(2)}</span> | Paid: <span className="fw-semibold text-success">₹{paid.toFixed(2)}</span></p>
            
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <button className="btn btn-outline-secondary px-4" onClick={() => router.push('/pending-orders')}>Back</button>
              <button className="btn btn-success px-4" onClick={handlePrint}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18" className="me-2 d-inline-block align-text-bottom">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v2.798c0 .124.004.248.012.373a48.16 48.16 0 0010.476 0c.008-.125.012-.249.012-.373v-2.798z" />
                </svg>
                Print Thermal
              </button>
              <button className="btn btn-primary px-4" onClick={handleDownloadPdf}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18" className="me-2 d-inline-block align-text-bottom">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download PDF
              </button>
              <button 
                className="btn btn-outline-success px-4" 
                onClick={handleSendWhatsApp}
              >
                <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18" className="me-2 d-inline-block align-text-bottom">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* THERMAL PRINT AREA */}
        <div id="thermal-bill" className="bill-print-area" style={{ display: 'none', padding: '10px', width: '300px', margin: '0 auto', fontFamily: 'monospace', fontSize: '12px' }}>
          <div className="fw-bold text-center" style={{ fontSize: '16px' }}>{settings?.shopName || 'Vegetable Wholesale'}</div>
          {settings?.phone && <div className="text-center mb-2">Ph: {settings.phone}</div>}
          
          <div className="d-flex justify-content-between border-top border-bottom py-1 mb-2">
            <div>Bill No: {generatedBillId.slice(0, 8).toUpperCase()}</div>
            <div>Date: {format(new Date(), 'dd/MM/yy')}</div>
          </div>
          <div className="mb-2 fw-bold border-bottom pb-1">
            Customer: {order.customerName}
          </div>

          <table className="w-100 mb-2">
            <thead>
              <tr className="border-bottom">
                <th className="text-start pb-1">Item</th>
                <th className="text-center pb-1">Qty</th>
                <th className="text-center pb-1">Rate</th>
                <th className="text-end pb-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1">{item.productName.substring(0, 12)}</td>
                  <td className="text-center py-1">{item.quantity}{item.unit}</td>
                  <td className="text-center py-1">{item.price}</td>
                  <td className="text-end py-1">{item.total.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-top pt-2">
            <div className="d-flex justify-content-between fw-bold">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {paid > 0 && (
              <div className="d-flex justify-content-between mt-1 text-success">
                <span>Paid:</span>
                <span>₹{paid.toFixed(2)}</span>
              </div>
            )}
            <div className="d-flex justify-content-between mt-1 fw-bold border-top pt-1 mt-1">
              <span>Net Bal:</span>
              <span>₹{balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center mt-4 border-top pt-2 fw-bold">Thank you for your business!</div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .no-print { display: none !important; }
            .bill-print-area { display: block !important; padding: 0 !important; width: 100% !important; }
            body { margin: 0; padding: 0; background: white; }
          }
        `}} />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <div>
          <h1 className="h2 mb-1 fw-bold">Process Billing</h1>
          <p className="text-muted mb-0">Order for <span className="fw-semibold text-dark">{order.customerName}</span></p>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="card-title mb-0 fw-bold">Items to Bill</h5>
        </div>
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th style={{ width: '150px' }}>Rate (₹)</th>
                <th className="text-end">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="fw-medium">{item.productName}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>
                    <input 
                      type="number" 
                      className="form-control form-control-sm" 
                      min="0"
                      step="0.01"
                      value={item.price || ''}
                      onChange={e => handlePriceChange(idx, e.target.value)}
                    />
                  </td>
                  <td className="text-end fw-bold">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-12 col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-3 fw-bold">Payment Details</h5>
              <div className="mb-3">
                <label className="form-label fw-semibold">Amount Paid Today (₹)</label>
                <input 
                  type="number" 
                  className="form-control form-control-lg" 
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                />
                <div className="form-text mt-2">Leave empty or 0 if unpaid. Remaining amount will be added to customer's balance.</div>
              </div>
              
              <div className="d-flex gap-2">
                <button className="btn btn-outline-success" onClick={() => setAmountPaid(subtotal.toString())}>Paid Full</button>
                <button className="btn btn-outline-secondary" onClick={() => setAmountPaid('0')}>Unpaid</button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-md-6">
          <div className="card shadow-sm h-100 bg-light border-0">
            <div className="card-body d-flex flex-column justify-content-center">
              <h5 className="card-title mb-4 fw-bold text-center">Summary</h5>
              <div className="d-flex justify-content-between mb-3 fs-5">
                <span className="text-muted fw-semibold">Subtotal</span>
                <span className="fw-bold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-3 fs-5">
                <span className="text-muted fw-semibold">Amount Paid</span>
                <span className="fw-bold text-success">- ₹{paid.toFixed(2)}</span>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between mt-2 fs-4">
                <span className="fw-bold text-dark">Net Balance Added</span>
                <span className={`fw-bold ${balance > 0 ? 'text-danger' : 'text-success'}`}>₹{balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 mt-4 pt-3 border-top d-flex justify-content-end gap-3">
          <button className="btn btn-outline-secondary px-4" onClick={() => router.back()}>Cancel</button>
          <button className="btn btn-success px-5 fw-bold" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating...</>
            ) : 'Generate Bill'}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
