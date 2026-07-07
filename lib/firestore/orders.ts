import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, orderBy, where, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { Order, OrderItem } from '@/types';

const COL = 'orders';

function toOrder(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    customerId: data.customerId as string,
    customerName: data.customerName as string,
    customerShopName: data.customerShopName as string | undefined,
    items: (data.items as OrderItem[]) ?? [],
    status: data.status as 'pending' | 'billed',
    date: data.date as string,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  };
}

export async function getOrders(): Promise<Order[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => toOrder(d.id, d.data()));
}

export async function getPendingOrders(): Promise<Order[]> {
  const q = query(
    collection(db, COL),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toOrder(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getOrdersByDate(date: string): Promise<Order[]> {
  const q = query(
    collection(db, COL),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toOrder(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function addOrder(data: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markOrderBilled(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { status: 'billed' });
}

export async function updateOrder(id: string, data: Partial<Pick<Order, 'items' | 'customerId' | 'customerName' | 'customerShopName'>>): Promise<void> {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteOrder(id: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COL, id));
}
