export type PlanId = "starter" | "pro" | "enterprise";

export type TenantStatus = "active" | "suspended" | "past_due";

export type SessionRole = "super" | "tenant_admin" | "staff";

export type Permission =
  | "home"
  | "pos"
  | "orders"
  | "kitchen"
  | "menu"
  | "stock"
  | "settings"
  | "staff";

export type OrderChannel = "guest" | "pos";
export type ServiceType = "table" | "pickup" | "delivery" | "counter";
export type PaymentMethod =
  | "pay_at_counter"
  | "paid_in_advance"
  | "cod"
  | "cash"
  | "card"
  | "wallet";
export type PaymentStatus = "unpaid" | "paid" | "cod_pending";
export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export interface Plan {
  id: PlanId;
  name: string;
  pricePkr: number;
  maxStaff: number;
  description: string;
  features: string[];
}

export interface PlatformTenantMeta {
  id: string;
  code: string;
  name: string;
  planId: PlanId;
  status: TenantStatus;
  renewsAt: string;
  createdAt: string;
}

export interface Session {
  token: string;
  role: SessionRole;
  tenantId?: string;
  userId?: string;
  impersonating?: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  restaurantName?: string;
  planId?: PlanId;
  message?: string;
  source: "contact" | "plans";
  createdAt: string;
}

export interface PlatformState {
  superAdmin: { username: string; password: string };
  plans: Plan[];
  tenants: PlatformTenantMeta[];
  sessions: Session[];
  leads: Lead[];
  contactWhatsapp: string;
}
