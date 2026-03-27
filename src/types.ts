export type OrderStatus = 'pending' | 'placed' | 'bought' | 'arriving' | 'received';

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  category: string;
  cost?: number;
  margin?: number;
  stock?: number;
  updated_at?: string;
}




export type OrderItemStatus = 'placed' | 'visto' | 'en_curso' | 'bought' | 'received' | 'unavailable' | 'anulado' | 'anulado_historial';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  status: OrderItemStatus;
  estimated_date?: string;
  cancellation_note?: string;
  admin_note?: string;
}

export interface Order {
  id: string;
  order_number?: number;
  created_at: string;
  employee_id: string;
  status: OrderStatus;
  items: OrderItem[];
  arrival_date?: string;
  is_bought: boolean;
  notes?: string;
  is_modified?: boolean;
}

export type UserRole = 'employee' | 'admin';
