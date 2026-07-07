export interface Customer {
  id: string;
  name: string;
  shopName?: string;
  phone: string;
  address: string;
  balance: number; // positive = customer owes us
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  unit: string; // kg, box, piece, etc.
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerShopName?: string;
  items: OrderItem[];
  status: 'pending' | 'billed';
  date: string; // YYYY-MM-DD
  createdAt: Date;
}

export interface BillItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  price: number;   // per unit price
  total: number;   // quantity * price
}

export interface Bill {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  date: string; // YYYY-MM-DD
  items: BillItem[];
  subtotal: number;
  amountPaid: number;
  balance: number; // subtotal - amountPaid
  status: 'paid' | 'partial' | 'unpaid';
  createdAt: Date;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: Date;
}

export interface ShopSettings {
  shopName: string;
  phone: string;
  address: string;
}

// Ledger entry for customer view (union of bills and payments)
export type LedgerEntry =
  | { type: 'bill'; date: string; data: Bill }
  | { type: 'payment'; date: string; data: Payment };
