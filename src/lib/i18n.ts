export type Lang = "en" | "ur";

/**
 * Staff UI dictionary. "ur" values are Roman Urdu (Latin script) so they read
 * on any device and any staff member can understand them. Add "en"+"ur" per key.
 */
export const dict = {
  // nav
  home: { en: "Home", ur: "Home" },
  pos: { en: "POS / Counter", ur: "POS / Counter" },
  orders: { en: "Orders", ur: "Orders" },
  kitchen: { en: "Kitchen", ur: "Kitchen" },
  tables: { en: "Tables", ur: "Tables" },
  menu: { en: "Menu", ur: "Menu" },
  staff: { en: "Staff", ur: "Staff" },
  dayClose: { en: "Day close", ur: "Din band" },
  sales: { en: "Sales & Profit", ur: "Sales & Profit" },
  settings: { en: "Settings", ur: "Settings" },

  // shell
  logout: { en: "Log out", ur: "Log out" },
  loading: { en: "Loading…", ur: "Load ho raha hai…" },
  restaurantAdmin: { en: "Restaurant Admin", ur: "Restaurant Admin" },
  staffRole: { en: "Staff", ur: "Staff" },
  superHelping: { en: "Super helping this restaurant", ur: "Super is kitchen mein madad kar raha hai" },
  helpTitle: { en: "Help mode · Super", ur: "Help mode · Super" },
  helpBody: {
    en: "You are helping {name} ({code}). This is not ORDO HQ and not their Admin login — open any Admin screen without their password.",
    ur: "Aap {name} ({code}) mein madad kar rahe hain. Yeh ORDO HQ nahi aur na hi unka Admin login — bina password ke koi bhi Admin screen khol sakte hain.",
  },
  backHq: { en: "Back to ORDO HQ", ur: "Wapas ORDO HQ" },
  billingTitle: { en: "Billing past due", ur: "Billing past due" },
  billingBody: {
    en: "Contact ORDO Super to renew. Staff tools stay open. Guests can still use Scanner → menu.",
    ur: "Renew ke liye ORDO Super se rabta karein. Staff tools khule rehte hain. Guests Scanner → menu use kar sakte hain.",
  },
  openScanner: { en: "Open scanner", ur: "Scanner kholo" },
  todayShift: { en: "today's shift", ur: "aaj ki shift" },

  // StaffAlerts
  enableSound: { en: "Enable order sound", ur: "Order sound chalu karo" },
  soundOn: { en: "Sound on", ur: "Sound on" },
  stopAlert: { en: "Stop alert", ur: "Alert roko" },
  beepContinues: { en: "Beep continues until you stop it.", ur: "Beep tab tak chalta rahega jab tak aap roko." },
  newOrder: { en: "New order", ur: "Naya order" },
  lowStock: { en: "Low stock", ur: "Stock kam" },
  stockEmpty: { en: "Stock 86 / empty", ur: "Stock 86 / khali" },

  // common
  all: { en: "All", ur: "Sab" },
  done: { en: "Done", ur: "Mukammal" },
  placed: { en: "Placed", ur: "Place hua" },
  accepted: { en: "Accepted", ur: "Accept hua" },
  preparing: { en: "Preparing", ur: "Ban raha hai" },
  ready: { en: "Ready", ur: "Ready" },
  completed: { en: "Completed", ur: "Mukammal" },
  cancelled: { en: "Cancelled", ur: "Cancel" },
  empty: { en: "Empty", ur: "Khali" },
  occupied: { en: "Occupied", ur: "Occupied" },
  bill: { en: "Bill", ur: "Bill" },
  new: { en: "New", ur: "Naya" },
  onThePass: { en: "On the pass", ur: "Pass par" },
  quickActions: { en: "Quick actions", ur: "Fauqul-faida kaam" },
  todayRevenue: { en: "Today revenue", ur: "Aaj ki kamai" },
  openTickets: { en: "Open tickets", ur: "Khule tickets" },
  completedVoid: { en: "Completed / void", ur: "Mukammal / void" },
  todayShiftLabel: { en: "today", ur: "aaj" },
  note: { en: "NOTE", ur: "NOTE" },

  // guest ordering
  yourOrder: { en: "Your order", ur: "Aapka order" },
  addDishes: { en: "Add dishes. This cart stays on this restaurant only.", ur: "Dishes add karein. Yeh cart sirf isi restaurant mein rehta hai." },
  searchPlaceholder: { en: "Search dishes…", ur: "Dishes dhoondein…" },
  noResults: { en: "No dishes match your search.", ur: "Aapki search se koi dish nahi mili." },
  browseMenu: { en: "Browse menu", ur: "Menu dekhein" },
  items: { en: "item", ur: "item" },

  // marketing (landing)
  heroTitle: {
    en: "The floor, the pass, and the guest — one ORDO.",
    ur: "Floor, pass, aur guest — sab ORDO mein.",
  },
  heroSub: {
    en: "From QR order to ticket in hand — one system. Simple, fast, isolated.",
    ur: "QR order se ticket tak — ek system. Simple, fast, isolated.",
  },
  openDemo: { en: "Open live demo", ur: "Demo kholo" },
  scanTable: { en: "Scan a table", ur: "Table scan karo" },
  fromPrice: { en: "From ₨999 / month", ur: "₨999 / mahinay se" },
  adminLogin: { en: "Admin Login", ur: "Admin Login" },
  talkOrdo: { en: "Talk to ORDO", ur: "ORDO se baat karo" },
  appTitle: { en: "ORDO ko phone mein try karein.", ur: "ORDO ko phone mein try karein." },
  appBody: {
    en: "POS, orders, kitchen, aur 58mm Bluetooth thermal print. Demo build — full branded per-kitchen app Super se upload hoti hai.",
    ur: "POS, orders, kitchen, aur 58mm Bluetooth thermal print. Demo build — full branded per-kitchen app Super se upload hoti hai.",
  },
  downloadApk: { en: "Download APK →", ur: "Download APK →" },
  webDemo: { en: "Ya web demo dekhein", ur: "Ya web demo dekhein" },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang) {
  return dict[key][lang];
}

export const LANG_KEY = "ordo_lang_v1";

export function defaultLang(): Lang {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(LANG_KEY) === "ur" ? "ur" : "en";
}
