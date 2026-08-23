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
  modifiers?: LineModifier[];
}

export interface LineModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
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

export interface OrderFees {
  subtotal: number;
  deliveryFee: number;
  packingFee: number;
  serviceCharge: number;
  tax: number;
  discount: number;
}

export interface Order {
  id: string;
  number: number;
  channel: "guest" | "pos";
  serviceType: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  paymentMethod: string;
  paymentStatus: string;
  status: OrderStatus;
  lines: OrderLine[];
  fees: OrderFees;
  total: number;
  subtotal: number;
  discount?: number;
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
  shop: {
    currency: string;
    taxRate?: number;
    serviceChargePercent?: number;
    deliveryFee?: number;
    packingFee?: number;
  };
  users: TenantUser[];
  orders: Order[];
  menu: MenuItem[];
  stock: StockItem[];
  tables: DiningTable[];
  orderingPaused?: boolean;
}

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  lowThreshold: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  available: boolean;
  isDeal?: boolean;
  imageEmoji?: string;
  imageUrl?: string;
  modifiers?: ModifierGroup[];
}

export interface DiningTable {
  id: string;
  label: string;
  seats: number;
  status: "empty" | "occupied" | "reserved" | "bill";
  currentOrderId?: string;
  reservedBy?: string;
  reservedUntil?: string;
  reservedMinutes?: number;
}

export interface Session {
  token: string;
  role: string;
  tenantId?: string;
  userId?: string;
}
