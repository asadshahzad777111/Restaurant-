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
  printer: { en: "Printer", ur: "Printer" },

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
  tryScanner: { en: "Try table scanner", ur: "Table scanner try karein" },
  galleryKicker: { en: "One kitchen, one truth", ur: "Ek kitchen, ek truth" },
  galleryTitle: { en: "Guest phone se printed ticket tak — ek hi system.", ur: "Guest phone se printed ticket tak — ek hi system." },
  galleryLead: { en: "Guest order, kitchen display, aur 58mm receipt — teeno ek hi catalog, ek hi truth.", ur: "Guest order, kitchen display, aur 58mm receipt — teeno ek hi catalog, ek hi truth." },
  liveDemoKicker: { en: "Live Demo Kitchen", ur: "Live Demo Kitchen" },
  liveDemoTitle: { en: "Try the guest path. No account needed.", ur: "Guest path try karein — koi account nahi." },
  liveDemoBody: {
    en: "Open Demo Kitchen as a guest: dining, pickup, delivery, and table QR scan. Staff tools stay behind Admin Login.",
    ur: "Demo Kitchen guest ki tarah kholen: dining, pickup, delivery, table QR. Staff tools Admin Login ke peeche hai.",
  },
  demoCode: { en: "Restaurant code", ur: "Restaurant code" },
  demoScan: { en: "QR or paste", ur: "QR ya paste" },
  demoPkr: { en: "On the page", ur: "Page par" },
  tourKicker: { en: "Product tour", ur: "Product tour" },
  tourTitle: { en: "From table phone to kitchen ticket to owner glance.", ur: "Table phone se kitchen ticket tak." },
  tourLead: { en: "Four stations. One kitchen catalog. Order delivery aur pickup sab locked.", ur: "Chaar stations. Ek kitchen catalog." },
  companyKicker: { en: "The company", ur: "Company" },
  companyTitle: { en: "We build the quiet layer between guests and the kitchen.", ur: "Guests aur kitchen ke beech quiet layer." },
  productsKicker: { en: "Product portfolio", ur: "Products" },
  productsTitle: { en: "One company. Products with a clear purpose.", ur: "Ek company. Clear purpose." },
  osKicker: { en: "ORDO OS", ur: "ORDO OS" },
  osTitle: { en: "Same data. Different work.", ur: "Same data. Different kaam." },
  plansKicker: { en: "Monthly plans", ur: "Monthly plans" },
  plansTitle: { en: "Pick a kitchen plan. Add paper when you need it.", ur: "Kitchen plan chunein. Paper kabhi bhi add." },
  plansLead: { en: "Same three prices on every quote.", ur: "Har quote par wahi teen prices." },
  flowKicker: { en: "Connected operations", ur: "Connected operations" },
  flowTitle: { en: "One order becomes one continuous kitchen record.", ur: "Ek order = ek continuous kitchen record." },
  pakKicker: { en: "Built for Pakistan", ur: "Pakistan ke liye" },
  pakTitle: { en: "Technology shaped by the way local kitchens actually work.", ur: "Local kitchens ke liye banaya hua." },
  insightsKicker: { en: "Insights", ur: "Insights" },
  insightsTitle: { en: "Understand the product, the thinking, and the company.", ur: "Product aur thinking samjhein." },
  aboutKicker: { en: "About", ur: "About" },
  aboutTitle: { en: "ORDO is the brand. ORDO OS is the live kitchen product.", ur: "ORDO brand hai, ORDO OS live product." },
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
