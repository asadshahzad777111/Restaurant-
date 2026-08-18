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
  /** GST / sales tax % */
  taxRate: number;
  openHours: string;
  deliveryFee: number;
  packingFee: number;
  /** Service charge % of subtotal */
  serviceChargePercent: number;
}

export interface TenantUser {
  id: string;
  username: string;
  password: string;
  role: "admin" | "staff";
  roleLabel: string;
  permissions: Permission[];
  active: boolean;
  mustChangePassword?: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multi: boolean;
  options: ModifierOption[];
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
  modifiers?: ModifierGroup[];
}

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  lowThreshold: number;
}

export interface LineModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderLine {
  itemId: string;
  name: string;
  qty: number;
  /** Base + selected modifiers */
  unitPrice: number;
  modifiers?: LineModifier[];
  lineNote?: string;
}

export interface OrderFees {
  subtotal: number;
  deliveryFee: number;
  packingFee: number;
  serviceCharge: number;
  tax: number;
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
  tableId?: string;
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
  fees: OrderFees;
  subtotal: number;
  total: number;
  cancelReason?: string;
}

export type TableStatus = "empty" | "occupied" | "bill";

export interface DiningTable {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  currentOrderId?: string;
}

export interface DayCloseSummary {
  id: string;
  closedAt: string;
  closedBy?: string;
  from: string;
  to: string;
  orderCount: number;
  cancelledCount: number;
  completedCount: number;
  grossTotal: number;
  byPayment: Record<string, number>;
  note?: string;
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
  tables: DiningTable[];
  dayCloses: DayCloseSummary[];
  nextOrderNumber: number;
}
