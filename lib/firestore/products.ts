import { db } from '@/lib/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { Product } from '@/types';

const COL = 'products';

function toProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    name: data.name as string,
    unit: data.unit as string,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  };
}

export async function getProducts(): Promise<Product[]> {
  const q = query(collection(db, COL), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => toProduct(d.id, d.data()));
}

export async function addProduct(data: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
