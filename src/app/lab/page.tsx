import Link from "next/link";
import styles from "./lab.module.css";

const LINKS = [
  { href: "/", label: "Marketing home", note: "ORDO landing" },
  { href: "/guest", label: "Guest entry", note: "Code · paste QR · Demo Kitchen" },
  { href: "/scan", label: "QR scanner", note: "Camera + paste fallback" },
  { href: "/super", label: "Super Admin", note: "super / super123" },
  { href: "/login", label: "Staff login", note: "DEMO · admin / admin123 (change in prod)" },
  { href: "/order?tenant=DEMO", label: "Guest hub", note: "Dining / takeaway / delivery" },
  { href: "/order?tenant=DEMO&table=7", label: "Table 7 QR", note: "Pay at counter" },
  { href: "/order?tenant=DEMO&mode=pickup", label: "Takeaway", note: "Counter or paid in advance" },
  { href: "/order?tenant=DEMO&mode=delivery", label: "Delivery", note: "COD or paid in advance" },
  { href: "/home", label: "Staff Home", note: "Low stock + day close" },
  { href: "/pos", label: "POS", note: "Counter sales" },
  { href: "/orders", label: "Orders", note: "Advance status" },
  { href: "/kitchen", label: "Kitchen", note: "Tickets" },
  { href: "/tables", label: "Tables", note: "empty / occupied / bill" },
  { href: "/menu", label: "Menu admin", note: "Deals + items" },
  { href: "/day-close", label: "Day close", note: "Shift summary" },
  { href: "/settings", label: "Settings", note: "Logo · staff · stock · QR" },
];

export default function LabPage() {
  return (
    <div className={styles.page}>
      <header>
        <p className={styles.brand}>ORDO</p>
        <h1>Lab — demo links</h1>
        <p className={styles.sub}>
          Localhost only. Cancel/void ≠ refund. Review path: guest order → Completed → track stars.
          Soft drinks stock is low on purpose for alerts.
        </p>
      </header>
      <ul className={styles.list}>
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>
              <strong>{l.label}</strong>
              <span>{l.note}</span>
              <code>{l.href}</code>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
