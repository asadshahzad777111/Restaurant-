import type { OrderFees, OrderLine, TenantShop } from "./tenant-types";
import type { ServiceType } from "./types";

export function lineUnitPrice(base: number, modifiers?: { priceDelta: number }[]) {
  return base + (modifiers?.reduce((s, m) => s + m.priceDelta, 0) ?? 0);
}

export function linesSubtotal(lines: OrderLine[]) {
  return lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
}

export function computeFees(
  shop: TenantShop,
  serviceType: ServiceType,
  lines: OrderLine[],
  /** Flat amount off the bill, applied BEFORE service charge & tax (standard POS). */
  discount = 0,
): OrderFees & { discount: number; total: number } {
  const subtotal = linesSubtotal(lines);
  const deliveryFee = serviceType === "delivery" ? shop.deliveryFee || 0 : 0;
  const packingFee =
    serviceType === "pickup" || serviceType === "delivery" ? shop.packingFee || 0 : 0;
  // Discount cannot exceed the pre-fee base.
  const d = Math.max(0, Math.min(Math.round(discount), subtotal + deliveryFee + packingFee));
  const base = subtotal + deliveryFee + packingFee - d;
  const serviceCharge = Math.round((base * (shop.serviceChargePercent || 0)) / 100);
  const taxable = base + serviceCharge;
  const tax =
    shop.printGstOnBill === true ? Math.round((taxable * (shop.taxRate || 0)) / 100) : 0;
  const total = taxable + tax;
  return { subtotal, deliveryFee, packingFee, serviceCharge, tax, discount: d, total };
}

export function money(currency: string, n: number) {
  const v = Number(n);
  const safe = Number.isFinite(v) ? v : 0;
  if (currency === "PKR") return `Rs ${safe.toLocaleString()}`;
  return `${currency || "PKR"} ${safe.toLocaleString()}`;
}
