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
  stock: { en: "Stock", ur: "Stock" },
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
  printerLinked: { en: "Printer linked", ur: "Printer linked" },
  androidPrinter: { en: "Android printer: connected", ur: "Android printer: connected" },
  androidPrinterOff: { en: "Android printer not connected", ur: "Android printer not connected" },
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
  stockEmpty: { en: "Out of stock", ur: "Stock khatam" },

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
    en: "POS, orders, kitchen, aur 58mm Bluetooth thermal print — Staff APK. Guests order on the web, table QR, ya scanner.",
    ur: "POS, orders, kitchen, aur 58mm Bluetooth thermal print — Staff APK. Guest web, table QR, ya scanner se order karte hain.",
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
  tourLead: {
    en: "Four stations. One kitchen catalog. Staff APK locks to that restaurant code. Guests order on the web, table QR, ya scanner — kitchens never mix.",
    ur: "Chaar stations. Ek kitchen catalog. Staff APK us restaurant code par lock. Guest web, table QR, ya scanner se order — kitchens mix nahi.",
  },
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
  productsLead: { en: "ORDO OS is our live flagship — not just a button on a till.", ur: "ORDO OS hamara live flagship hai — sirf ek button nahi." },
  flowOrder: { en: "Guest menu, table QR, ya counter POS — ek kitchen queue.", ur: "Guest menu, table QR, ya counter POS — ek kitchen queue." },
  flowPrepare: { en: "Kitchen work routed through preparation.", ur: "Kitchen kaam preparation mein rukta hai." },
  flowHandoff: { en: "Ready for the pass, pickup shelf, ya delivery run.", ur: "Ready — pass, pickup shelf, ya delivery run." },
  flowRecord: { en: "Pay method ticket par. Stock alerts isi tenant par.", ur: "Pay method ticket par. Stock alerts isi tenant par." },
  flowUnderstand: { en: "Guest tracking live. Completed ticket = review.", ur: "Guest tracking live. Completed ticket = review." },
  tourGuest: { en: "Scan table QR ya scanner — menu, cart, track.", ur: "Table QR ya scanner — menu, cart, track." },
  tourPos: { en: "Staff APK / POS — 58mm print, same catalog. Out-of-stock blocks sale.", ur: "Staff APK / POS — 58mm print, same catalog. Out-of-stock block." },
  tourKitchen: { en: "Tickets placed → preparing → ready. Sound + notify.", ur: "Tickets placed → preparing → ready. Sound + notify." },
  tourOwner: { en: "Sales & Profit, day close, Super HQ billing, Staff APK.", ur: "Sales & Profit, day close, Super HQ billing, Staff APK." },
  footerTag: { en: "Guest QR, counter POS, aur pass — ek system mein.", ur: "Guest QR, counter POS, aur pass — ek system mein." },
  footerIsolated: { en: "Isolated per kitchen · priced in PKR", ur: "Isolated per kitchen · PKR mein pricing" },
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
