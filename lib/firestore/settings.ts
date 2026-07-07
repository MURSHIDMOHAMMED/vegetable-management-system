import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ShopSettings } from '@/types';

const DOC_PATH = 'settings/shop';

const defaultSettings: ShopSettings = {
  shopName: 'Vegetable Wholesale',
  phone: '',
  address: '',
};

export async function getSettings(): Promise<ShopSettings> {
  const snap = await getDoc(doc(db, DOC_PATH));
  if (!snap.exists()) return defaultSettings;
  return snap.data() as ShopSettings;
}

export async function saveSettings(settings: ShopSettings): Promise<void> {
  await setDoc(doc(db, DOC_PATH), settings);
}
