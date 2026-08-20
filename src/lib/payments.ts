import type { PaymentMethod, ServiceType } from "./types";
import type { PaymentAccount, TenantPayments, TenantSpecialOffer } from "./tenant-types";

function account(partial?: Partial<PaymentAccount>): PaymentAccount {
  return {
    enabled: false,
    title: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    iban: "",
    ...partial,
  };
}

export function defaultTenantPayments(): TenantPayments {
  return {
    codEnabled: true,
    advanceEnabled: true,
    payAtCounterEnabled: true,
    methods: {
      bank: account({
        title: "Bank transfer",
        enabled: false,
      }),
      jazzcash: account({
        title: "JazzCash",
        enabled: false,
      }),
      easypaisa: account({
        title: "EasyPaisa",
        enabled: false,
      }),
    },
  };
}

export function normalizeTenantPayments(raw?: TenantPayments | null): TenantPayments {
  const d = defaultTenantPayments();
  if (!raw) return d;
  return {
    codEnabled: raw.codEnabled !== false,
    advanceEnabled: raw.advanceEnabled !== false,
    payAtCounterEnabled: raw.payAtCounterEnabled !== false,
    methods: {
      bank: { ...d.methods.bank, ...raw.methods?.bank },
      jazzcash: { ...d.methods.jazzcash, ...raw.methods?.jazzcash },
      easypaisa: { ...d.methods.easypaisa, ...raw.methods?.easypaisa },
    },
  };
}

export function publicPayments(raw?: TenantPayments | null): TenantPayments {
  return normalizeTenantPayments(raw);
}

export function defaultSpecialOffer(): TenantSpecialOffer {
  return {
    enabled: false,
    title: "",
    body: "",
    imageUrl: "",
    ctaLabel: "OK",
    updatedAt: new Date(0).toISOString(),
  };
}

export function normalizeSpecialOffer(raw?: TenantSpecialOffer | null): TenantSpecialOffer {
  const d = defaultSpecialOffer();
  if (!raw) return d;
  return {
    enabled: Boolean(raw.enabled && (raw.title?.trim() || raw.body?.trim())),
    title: raw.title || "",
    body: raw.body || "",
    imageUrl: raw.imageUrl || "",
    ctaLabel: raw.ctaLabel || "OK",
    updatedAt: raw.updatedAt || d.updatedAt,
  };
}

export function enabledAdvanceRails(payments: TenantPayments) {
  const rails: Array<{ id: "bank" | "jazzcash" | "easypaisa"; account: PaymentAccount }> = [];
  (["bank", "jazzcash", "easypaisa"] as const).forEach((id) => {
    const a = payments.methods[id];
    if (a?.enabled && (a.accountNumber?.trim() || a.iban?.trim())) {
      rails.push({ id, account: a });
    }
  });
  return rails;
}

/** Guest payment radios — respects Admin COD / advance / counter toggles. */
export function paymentChoicesFor(
  mode: ServiceType,
  payments?: TenantPayments | null,
): { id: PaymentMethod; label: string; hint: string }[] {
  const p = normalizeTenantPayments(payments);
  const rails = enabledAdvanceRails(p);
  const advanceHint =
    rails.length > 0
      ? "Pay to Admin’s JazzCash / EasyPaisa / bank, then upload screenshot."
      : "Admin has not published transfer details yet — ask staff, or pay COD/counter.";

  if (mode === "table") {
    return [
      {
        id: "pay_at_counter",
        label: "Pay at counter",
        hint: "Settle with staff at the restaurant.",
      },
    ];
  }

  const out: { id: PaymentMethod; label: string; hint: string }[] = [];
  if (mode === "delivery" && p.codEnabled) {
    out.push({
      id: "cod",
      label: "Cash on delivery",
      hint: "Pay the rider in cash.",
    });
  }
  if (mode === "pickup" && p.payAtCounterEnabled) {
    out.push({
      id: "pay_at_counter",
      label: "Pay at counter",
      hint: "Pay when you collect.",
    });
  }
  if (p.advanceEnabled && (mode === "pickup" || mode === "delivery")) {
    out.push({
      id: "paid_in_advance",
      label: "Advance payment",
      hint: advanceHint,
    });
  }
  if (!out.length) {
    out.push({
      id: mode === "delivery" ? "cod" : "pay_at_counter",
      label: mode === "delivery" ? "Cash on delivery" : "Pay at counter",
      hint: "Default payment.",
    });
  }
  return out;
}

export function assertGuestPaymentAllowed(
  mode: ServiceType,
  method: PaymentMethod,
  payments?: TenantPayments | null,
): string | null {
  const p = normalizeTenantPayments(payments);
  if (mode === "table" && method !== "pay_at_counter") return "Table orders pay at the counter";
  if (method === "cod") {
    if (mode !== "delivery") return "COD is only for delivery";
    if (!p.codEnabled) return "Cash on delivery is disabled by this restaurant";
  }
  if (method === "paid_in_advance" || method === "bank" || method === "jazzcash" || method === "easypaisa") {
    if (!p.advanceEnabled) return "Advance payment is disabled by this restaurant";
  }
  if (method === "pay_at_counter" && mode === "pickup" && !p.payAtCounterEnabled) {
    return "Pay at counter is disabled — use advance payment";
  }
  return null;
}
