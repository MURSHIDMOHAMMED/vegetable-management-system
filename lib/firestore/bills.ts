import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { Bill } from '@/types';
import { updateCustomerBalance } from './customers';
import { markOrderBilled } from './orders';

const COL = 'bills';

function toBill(id: string, data: Record<string, unknown>): Bill {
  return {
    id,
    orderId: data.orderId as string,
    customerId: data.customerId as string,
    customerName: data.customerName as string,
    date: data.date as string,
    items: (data.items as Bill['items']) ?? [],
    subtotal: data.subtotal as number,
    amountPaid: data.amountPaid as number,
    balance: data.balance as number,
    status: data.status as 'paid' | 'partial' | 'unpaid',
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  };
}

export async function getBills(): Promise<Bill[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => toBill(d.id, d.data()));
}

export async function getBillsByCustomer(customerId: string): Promise<Bill[]> {
  const q = query(
    collection(db, COL),
    where('customerId', '==', customerId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toBill(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getBillsByDate(date: string): Promise<Bill[]> {
  const q = query(
    collection(db, COL),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toBill(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getBillsByMonth(yearMonth: string): Promise<Bill[]> {
  // yearMonth = 'YYYY-MM'
  const q = query(collection(db, COL), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toBill(d.id, d.data()))
    .filter(b => b.date.startsWith(yearMonth));
}

export async function getBillsLast30Days(): Promise<Bill[]> {
  const q = query(collection(db, COL), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return snap.docs
    .map(d => toBill(d.id, d.data()))
    .filter(b => b.date >= cutoffStr);
}

/**
 * Creates a bill, marks order as billed, and updates customer balance.
 * The net effect on customer balance = subtotal - amountPaid (unpaid portion).
 */
export async function createBill(bill: Omit<Bill, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...bill,
    createdAt: serverTimestamp(),
  });
  // Mark the source order as billed
  await markOrderBilled(bill.orderId);
  // Add the unpaid amount to customer balance (they owe us)
  const unpaid = bill.subtotal - bill.amountPaid;
  if (unpaid !== 0) {
    await updateCustomerBalance(bill.customerId, unpaid);
  }
  return ref.id;
}

/**
 * Updates a bill's prices/payment and adjusts customer balance accordingly.
 * Reverses old balance effect then applies new one.
 */
export async function updateBill(
  billId: string,
  updates: Pick<Bill, 'items' | 'subtotal' | 'amountPaid' | 'balance' | 'status'>
): Promise<void> {
  // Get the current bill to reverse its balance effect
  const snap = await getDoc(doc(db, COL, billId));
  if (!snap.exists()) throw new Error('Bill not found');
  const old = toBill(snap.id, snap.data());

  // Reverse old balance effect
  const oldUnpaid = old.subtotal - old.amountPaid;
  if (oldUnpaid !== 0) {
    await updateCustomerBalance(old.customerId, -oldUnpaid);
  }

  // Apply new balance effect
  const newUnpaid = updates.subtotal - updates.amountPaid;
  if (newUnpaid !== 0) {
    await updateCustomerBalance(old.customerId, newUnpaid);
  }

  await updateDoc(doc(db, COL, billId), {
    items: updates.items,
    subtotal: updates.subtotal,
    amountPaid: updates.amountPaid,
    balance: updates.balance,
    status: updates.status,
  });
}

/**
 * Deletes a bill and reverses its effect on customer balance.
 * Also marks the linked order back to pending.
 */
export async function deleteBill(billId: string): Promise<void> {
  const snap = await getDoc(doc(db, COL, billId));
  if (!snap.exists()) throw new Error('Bill not found');
  const bill = toBill(snap.id, snap.data());

  // Reverse balance: subtract the unpaid amount we had added
  const unpaid = bill.subtotal - bill.amountPaid;
  if (unpaid !== 0) {
    await updateCustomerBalance(bill.customerId, -unpaid);
  }

  // Mark order back to pending so it can be re-billed
  if (bill.orderId) {
    await updateDoc(doc(db, 'orders', bill.orderId), { status: 'pending' });
  }

  await deleteDoc(doc(db, COL, billId));
}
