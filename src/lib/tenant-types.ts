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
  /**
   * Kitchen opt-in. Only meaningful when Super enables platform.features.fbrOptional.
   * There is no dedicated FBR page — fields stay inside Settings when allowed.
   */
  fbrEnabled?: boolean;
  /** Print branding logo on 58mm customer bill (AsFix tick-on-print). Default true when logo set. */
  printLogoOnBill?: boolean;
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
  /** Optional — restaurant Admin inbox for order/welcome mail. */
  email?: string;
  /**
   * Super-only recoverable plaintext of the last password set/reset.
   * Login uses `password` (scrypt). Never return this on public/staff APIs.
   */
  superKnownPassword?: string;
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
  /** Optional kitchen cost for Profit Profile (never shown to guests). */
  costPrice?: number;
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
  /** When advance: which Admin account the diner used */
  advanceRail?: "bank" | "jazzcash" | "easypaisa";
  /** Screenshot URL of transfer (JazzCash / bank / EasyPaisa) */
  paymentProofUrl?: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  trackToken: string;
  createdAt: string;
  updatedAt: string;
  fees: OrderFees;
  subtotal: number;
  total: number;
  /** POS-only PKR off the bill. Optional. */
  discount?: number;
  cancelReason?: string;
}

export interface PaymentAccount {
  enabled: boolean;
  title: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  iban?: string;
}

export interface TenantPayments {
  /** Delivery COD — Admin can turn off */
  codEnabled: boolean;
  /** Show advance / online transfer options */
  advanceEnabled: boolean;
  /** Pickup/table pay at counter */
  payAtCounterEnabled: boolean;
  methods: {
    bank: PaymentAccount;
    jazzcash: PaymentAccount;
    easypaisa: PaymentAccount;
  };
}

export interface TenantSpecialOffer {
  enabled: boolean;
  title: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  updatedAt: string;
}

export type TableStatus = "empty" | "occupied" | "bill";

export interface DiningTable {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  currentOrderId?: string;
}

/** Guest who signed in with Google for this kitchen (Customer APK / web). */
export interface GuestClient {
  id: string;
  email: string;
  name: string;
  googleSub?: string;
  createdAt: string;
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
  /** Guest payment rails + COD toggle */
  payments?: TenantPayments;
  /** Dismissible special offer popup on guest order */
  specialOffer?: TenantSpecialOffer;
  /** Kitchen admin toggle — pauses guest ordering (bill is paused) without suspending staff. */
  orderingPaused?: boolean;
  users: TenantUser[];
  menu: MenuItem[];
  stock: StockItem[];
  orders: Order[];
  reviews: Review[];
  tables: DiningTable[];
  /** Google-registered diners for this kitchen only */
  guestClients?: GuestClient[];
  dayCloses: DayCloseSummary[];
  nextOrderNumber: number;
}
