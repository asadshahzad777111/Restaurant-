"use client";

import { isNativeStaffApp, getSavedPrinter } from "@/lib/thermal/nativePosPrint";
import { printCustomerReceipt, printKitchenTicket } from "@/lib/print";
import { printApi } from "@/lib/print-api";
import type { Order, TenantState } from "@/lib/tenant-types";

export type PrintPath = "native" | "android" | "browser";

export async function decidePrintPath(): Promise<PrintPath> {
  if (isNativeStaffApp()) {
    const saved = await getSavedPrinter();
    if (saved?.address) return "native";
  }
  try {
    const st = await printApi.getBridge();
    if (st.connected) return "android";
  } catch {
    /* browser fallback */
  }
  return "browser";
}

export async function enqueueSlip(tenant: TenantState, order: Order, kind: "bill" | "kitchen") {
  const { customerReceiptText, kitchenTicketText } = await import("@/lib/print");
  const text = kind === "kitchen" ? kitchenTicketText(tenant, order) : customerReceiptText(tenant, order);
  await printApi.createPrintJob({
    kind,
    text,
    orderId: order.id,
    orderRef: `#${order.number}`,
  });
}

export async function executeLocalPrint(tenant: TenantState, order: Order, kind: "bill" | "kitchen") {
  if (kind === "kitchen") return printKitchenTicket(tenant, order);
  return printCustomerReceipt(tenant, order);
}
