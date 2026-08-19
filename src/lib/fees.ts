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
): OrderFees & { total: number } {
  const subtotal = linesSubtotal(lines);
  const deliveryFee = serviceType === "delivery" ? shop.deliveryFee || 0 : 0;
  const packingFee =
    serviceType === "pickup" || serviceType === "delivery" ? shop.packingFee || 0 : 0;
  const serviceCharge = Math.round((subtotal * (shop.serviceChargePercent || 0)) / 100);
  const taxable = subtotal + deliveryFee + packingFee + serviceCharge;
  const tax = Math.round((taxable * (shop.taxRate || 0)) / 100);
  const total = taxable + tax;
  return { subtotal, deliveryFee, packingFee, serviceCharge, tax, total };
}

export function money(currency: string, n: number) {
  if (currency === "PKR") return `Rs ${n.toLocaleString()}`;
  return `${currency} ${n.toLocaleString()}`;
}
