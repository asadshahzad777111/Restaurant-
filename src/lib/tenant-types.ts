import type {
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Permission,
  ServiceType,
} from "./types";

export interface TenantBranding {
  name: string;
  logoUrl: string;
  receiptFooter: string;
}

export interface TenantShop {
  address: string;
  phone: string;
  whatsapp: string;
  currency: string;
  taxRate: number;
  openHours: string;
}

export interface TenantUser {
  id: string;
  username: string;
  password: string;
  role: "admin" | "staff";
  roleLabel: string;
  permissions: Permission[];
  active: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  isDeal?: boolean;
  dealLabel?: string;
  compareAtPrice?: number;
  imageEmoji?: string;
  imageUrl?: string;
}

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  lowThreshold: number;
}

export interface OrderLine {
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface StatusEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  number: number;
  channel: OrderChannel;
  serviceType: ServiceType;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  lines: OrderLine[];
  note?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  trackToken: string;
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  total: number;
}

export interface Review {
  id: string;
  trackToken: string;
  orderId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface TenantState {
  id: string;
  code: string;
  branding: TenantBranding;
  shop: TenantShop;
  users: TenantUser[];
  menu: MenuItem[];
  stock: StockItem[];
  orders: Order[];
  reviews: Review[];
  nextOrderNumber: number;
}
