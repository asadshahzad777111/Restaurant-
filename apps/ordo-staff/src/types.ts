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
}

export interface Session {
  token: string;
  role: string;
  tenantId?: string;
  userId?: string;
}
