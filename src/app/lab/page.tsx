import Link from "next/link";
import styles from "./lab.module.css";

const LINKS = [
  { href: "/", label: "Marketing home", note: "ORDO landing" },
  { href: "/super", label: "Super Admin", note: "super / super123" },
  { href: "/login", label: "Staff login", note: "DEMO · admin / admin123 (change in prod)" },
  { href: "/order?tenant=DEMO", label: "Guest hub", note: "EN/Urdu · fees · modifiers" },
  { href: "/order?tenant=DEMO&table=3", label: "Table 3 QR", note: "Dine-in + table status" },
  { href: "/order?tenant=DEMO&mode=pickup", label: "Pickup", note: "Packing fee applies" },
  { href: "/order?tenant=DEMO&mode=delivery", label: "Delivery", note: "Delivery fee applies" },
  { href: "/home", label: "Staff Home", note: "Low stock + day close link" },
  { href: "/pos", label: "POS", note: "Modifiers · fees · print bill" },
  { href: "/orders", label: "Orders", note: "Cancel/void · msgs · print" },
  { href: "/kitchen", label: "Kitchen", note: "Mods on tickets" },
  { href: "/tables", label: "Tables", note: "empty / occupied / bill" },
  { href: "/menu", label: "Menu admin", note: "One-tap 86" },
  { href: "/day-close", label: "Day close", note: "Shift summary" },
  { href: "/settings", label: "Settings", note: "Fees · export · password" },
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
