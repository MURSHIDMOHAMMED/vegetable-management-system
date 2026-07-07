import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { Customer } from '@/types';

const COL = 'customers';

function toCustomer(id: string, data: Record<string, unknown>): Customer {
  return {
    id,
    name: data.name as string,
    shopName: (data.shopName as string) ?? '',
    phone: data.phone as string,
    address: data.address as string,
    balance: (data.balance as number) ?? 0,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const q = query(collection(db, COL), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => toCustomer(d.id, d.data()));
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return toCustomer(snap.id, snap.data());
}

export async function addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'balance'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    balance: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCustomer(id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function updateCustomerBalance(id: string, delta: number): Promise<void> {
  const customer = await getCustomer(id);
  if (!customer) return;
  await updateDoc(doc(db, COL, id), { balance: customer.balance + delta });
}
