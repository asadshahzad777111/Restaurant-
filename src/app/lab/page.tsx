import Link from "next/link";
import styles from "./lab.module.css";

const LINKS = [
  { href: "/", label: "Marketing home", note: "ORDO landing" },
  {
    href: "/login?owner=1",
    label: "ORDO HQ login (you)",
    note: "Platform owner — WordPress-simple control",
  },
  { href: "/control", label: "ORDO HQ panel", note: "After owner login" },
  { href: "/login", label: "Restaurant staff login", note: "DEMO · admin / admin123" },
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
  { href: "/settings", label: "Settings", note: "Fees · export · R2 backup · password" },
  { href: "/api/health", label: "Health (uptime)", note: "Mongo/file + integrations flags" },
];

export default function LabPage() {
  return (
    <div className={styles.page}>
      <header>
        <p className={styles.brand}>ORDO</p>
        <h1>Lab — demo links</h1>
        <p className={styles.sub}>
          Localhost only. Live: restaurants on ordo.asfins.com · owner on control.asfins.com (no owner
          button on restaurant login). Cancel/void ≠ refund.
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
