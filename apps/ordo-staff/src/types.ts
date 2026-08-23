export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export interface OrderLine {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineNote?: string;
}

export interface Order {
  id: string;
  number: number;
  channel: "guest" | "pos";
  serviceType: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  status: OrderStatus;
  paymentStatus: string;
  lines: OrderLine[];
  total: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUser {
  id: string;
  username: string;
  role: "admin" | "staff";
  roleLabel: string;
  permissions: string[];
}

export interface Tenant {
  id: string;
  code: string;
  branding: { name: string; logoUrl?: string };
  shop: { currency: string };
  users: TenantUser[];
  orders: Order[];
  menu: MenuItem[];
  tables: DiningTable[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  isDeal?: boolean;
}

export interface DiningTable {
  id: string;
  label: string;
  seats: number;
  status: "empty" | "occupied" | "bill";
  currentOrderId?: string;
}

export interface Session {
  token: string;
  role: string;
  tenantId?: string;
  userId?: string;
}
