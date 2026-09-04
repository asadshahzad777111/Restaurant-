"use client";

import { isNativeStaffApp, getSavedPrinter } from "@/lib/thermal/nativePosPrint";
import { printCustomerReceipt, printKitchenTicket } from "@/lib/print";
import { printApi, type PrintBridgeStatus } from "@/lib/print-api";
import type { Order, TenantState } from "@/lib/tenant-types";

/** Website / iPhone Safari always get the Print-to-Android chooser. Staff APK with a saved printer prints Bluetooth locally. */
export async function shouldOpenPrintChooser(): Promise<boolean> {
  if (!isNativeStaffApp()) return true;
  const saved = await getSavedPrinter();
  return !saved?.address;
}

export async function fetchBridgeStatus(): Promise<PrintBridgeStatus> {
  try {
    return await printApi.getBridge();
  } catch {
    return { connected: false, lastSeen: null, printerName: null };
  }
}

export async function enqueueSlip(tenant: TenantState, order: Order, kind: "bill" | "kitchen") {
  const { customerReceiptText, kitchenTicketText } = await import("@/lib/print");
  const { guestOrderPageUrl, receiptLogoUrl } = await import("@/lib/receipt-layout");
  const { rasterizeLogoForEscPos, sameOriginLogoUrl } = await import("@/lib/receipt-logo");
  const { bytesToBase64 } = await import("@/lib/escpos-receipt");
  const { resolveBillLayout, paperDotsFor } = await import("@/lib/bill-layout");
  const text = kind === "kitchen" ? kitchenTicketText(tenant, order) : customerReceiptText(tenant, order);
  const logo = kind === "bill" ? receiptLogoUrl(tenant) : null;
  const layout = kind === "bill" ? resolveBillLayout(tenant.shop) : null;
  let logoEscPosBase64: string | null = null;
  if (logo && layout) {
    try {
      const raster = await rasterizeLogoForEscPos(logo, {
        boxW: layout.logoDots,
        boxH: layout.logoDots,
        paperDots: paperDotsFor(layout.paperMm),
      });
      if (raster?.length) logoEscPosBase64 = bytesToBase64(new Uint8Array(raster));
    } catch {
      logoEscPosBase64 = null;
    }
  }
  await printApi.createPrintJob({
    kind,
    text,
    qrUrl: kind === "bill" ? guestOrderPageUrl(tenant.code) : null,
    logoUrl: logo ? sameOriginLogoUrl(logo) : null,
    logoEscPosBase64,
    paperMm: layout?.paperMm ?? null,
    logoDots: layout?.logoDots ?? null,
    qrDots: layout?.qrDots ?? null,
    orderId: order.id,
    orderRef: `#${order.number}`,
  });
}

export async function executeLocalPrint(tenant: TenantState, order: Order, kind: "bill" | "kitchen") {
  if (kind === "kitchen") return printKitchenTicket(tenant, order);
  return printCustomerReceipt(tenant, order);
}
