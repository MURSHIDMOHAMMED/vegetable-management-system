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
        <div className="loading-screen" style={{ minHeight: '300px' }}>
          <div className="spinner" />
        </div>
      </AuthGuard>
    );
  }

  if (!order) {
    return (
      <AuthGuard>
        <div className="empty-state">
          <p>Order not found</p>
          <button className="btn btn-primary mt-4" onClick={() => router.push('/pending-orders')}>Go Back</button>
        </div>
      </AuthGuard>
    );
  }

  if (billGenerated) {
    return (
      <AuthGuard>
        <div className="page-header no-print">
          <h1>Bill Generated Successfully</h1>
        </div>
        
        <div className="card mb-6 no-print">
          <div className="card-body text-center py-8 flex-col items-center gap-4">
            <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: 32, height: 32}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2>Bill for {order.customerName}</h2>
            <p className="text-muted">Subtotal: ₹{subtotal.toFixed(2)} | Paid: ₹{paid.toFixed(2)}</p>
            <div className="flex gap-4 mt-4 flex-wrap justify-center">
              <button className="btn btn-outline" onClick={() => router.push('/pending-orders')}>Back</button>
              <button className="btn btn-primary" onClick={handlePrint}>Print Thermal</button>
              <button className="btn btn-primary" onClick={handleDownloadPdf}>Download PDF</button>
              <button 
                className="btn btn-outline" 
                style={{ borderColor: '#25D366', color: '#25D366' }} 
                onClick={handleSendWhatsApp}
              >
                <svg fill="currentColor" viewBox="0 0 24 24" style={{width:18, height:18, marginRight:6}}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* THERMAL PRINT AREA */}
        <div id="thermal-bill" className="bill-print-area" style={{ display: 'none' }}>
          <div className="shop-name">{settings?.shopName || 'Vegetable Wholesale'}</div>
          {settings?.phone && <div style={{textAlign: 'center', fontSize: '11px', marginBottom: '4px'}}>Ph: {settings.phone}</div>}
          
          <div className="bill-meta">
            <div>Bill No: {generatedBillId.slice(0, 8).toUpperCase()}</div>
            <div>Date: {format(new Date(), 'dd/MM/yy')}</div>
          </div>
          <div className="bill-meta">
            <div>Customer: {order.customerName}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{width: '40%'}}>Item</th>
                <th style={{width: '20%', textAlign: 'center'}}>Qty</th>
                <th style={{width: '20%', textAlign: 'center'}}>Rate</th>
                <th style={{width: '20%', textAlign: 'right'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.productName.substring(0, 12)}</td>
                  <td style={{textAlign: 'center'}}>{item.quantity}{item.unit}</td>
                  <td style={{textAlign: 'center'}}>{item.price}</td>
                  <td style={{textAlign: 'right'}}>{item.total.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="total-row mt-2 pt-2">
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {paid > 0 && (
              <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'normal'}}>
                <span>Paid:</span>
                <span>₹{paid.toFixed(2)}</span>
              </div>
            )}
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px'}}>
              <span>Net Bal:</span>
              <span>₹{balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="footer-note">Thank you for your business!</div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .no-print { display: none !important; }
            .bill-print-area { display: block !important; }
            body { margin: 0; padding: 0; background: white; }
          }
        `}} />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="page-header">
        <div>
          <h1>Process Billing</h1>
          <p className="text-muted">Order for {order.customerName}</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th style={{ width: '150px' }}>Rate (₹)</th>
                <th className="text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="font-medium">{item.productName}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ padding: '0.25rem 0.5rem' }}
                      min="0"
                      step="0.01"
                      value={item.price || ''}
                      onChange={e => handlePriceChange(idx, e.target.value)}
                    />
                  </td>
                  <td className="text-right font-medium">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-body form-grid-2">
          <div>
            <div className="form-group mb-4">
              <label className="form-label">Amount Paid Today (₹)</label>
              <input 
                type="number" 
                className="form-input" 
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-sm text-muted mt-1">Leave empty or 0 if unpaid. Remaining amount will be added to customer's balance.</p>
            </div>
            
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" onClick={() => setAmountPaid(subtotal.toString())}>Paid Full</button>
              <button className="btn btn-outline btn-sm" onClick={() => setAmountPaid('0')}>Unpaid</button>
            </div>
          </div>
          
          <div className="card bg-gray-50" style={{ background: 'var(--bg-hover)' }}>
            <div className="card-body flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-muted font-medium">Subtotal</span>
                <span className="font-bold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Amount Paid</span>
                <span className="font-bold text-success">- ₹{paid.toFixed(2)}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--border)' }}></div>
              <div className="flex justify-between" style={{ fontSize: '1.25rem' }}>
                <span className="font-bold">Net Balance Added</span>
                <span className="font-bold text-danger">₹{balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card-body border-t" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex justify-end gap-4">
            <button className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Generating...' : 'Generate Bill'}
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
