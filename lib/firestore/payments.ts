import { db } from '@/lib/firebase';
import {
  collection, addDoc, getDocs,
  query, orderBy, where, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { Payment } from '@/types';
import { updateCustomerBalance } from './customers';

const COL = 'payments';

function toPayment(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    customerId: data.customerId as string,
    customerName: data.customerName as string,
    amount: data.amount as number,
    note: (data.note as string) ?? '',
    date: data.date as string,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  };
}

export async function getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
  const q = query(
    collection(db, COL),
    where('customerId', '==', customerId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toPayment(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getPaymentsByDate(date: string): Promise<Payment[]> {
  const q = query(
    collection(db, COL),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toPayment(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getPaymentsByMonth(yearMonth: string): Promise<Payment[]> {
  const q = query(collection(db, COL), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toPayment(d.id, d.data()))
    .filter(p => p.date.startsWith(yearMonth));
}

/**
 * Records a payment and reduces customer balance.
 */
export async function recordPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...payment,
    createdAt: serverTimestamp(),
  });
  // Reduce customer balance (they paid us)
  await updateCustomerBalance(payment.customerId, -payment.amount);
  return ref.id;
}
