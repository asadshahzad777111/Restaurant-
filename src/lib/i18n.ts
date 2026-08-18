export type Lang = "en" | "ur";

const dict = {
  all: { en: "All", ur: "Sab" },
  place: { en: "Place", ur: "Order karo" },
  yourOrder: { en: "Your order", ur: "Aapka order" },
  pickup: { en: "Pickup", ur: "Pickup" },
  delivery: { en: "Delivery", ur: "Delivery" },
  table: { en: "Table", ur: "Table" },
  payment: { en: "Payment", ur: "Payment" },
  clearCart: { en: "Clear cart", ur: "Cart clear" },
  placeOrder: { en: "Place order", ur: "Order confirm" },
  unavailable: { en: "Unavailable", ur: "Available nahi" },
  eightySix: { en: "86", ur: "86" },
  cancel: { en: "Cancel / Void", ur: "Cancel / Void" },
  reason: { en: "Reason", ur: "Wajah" },
  lowStock: { en: "Low stock", ur: "Stock kam" },
  dayClose: { en: "Day close", ur: "Din band" },
  tables: { en: "Tables", ur: "Tables" },
  empty: { en: "Empty", ur: "Khali" },
  occupied: { en: "Occupied", ur: "Occupied" },
  bill: { en: "Bill", ur: "Bill" },
  export: { en: "Export", ur: "Export" },
  newOrder: { en: "New order", ur: "Naya order" },
  preparing: { en: "Preparing", ur: "Ban raha hai" },
  ready: { en: "Ready", ur: "Ready" },
  cancelled: { en: "Cancelled", ur: "Cancel ho gaya" },
  home: { en: "Home", ur: "Home" },
  orders: { en: "Orders", ur: "Orders" },
  kitchen: { en: "Kitchen", ur: "Kitchen" },
  menu: { en: "Menu", ur: "Menu" },
  settings: { en: "Settings", ur: "Settings" },
  pos: { en: "POS", ur: "POS / Counter" },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang) {
  return dict[key][lang];
}

export function dual(key: DictKey, lang: Lang) {
  if (lang === "en") return dict[key].en;
  return `${dict[key].ur}`;
}

export const LANG_KEY = "ordo_lang_v1";
