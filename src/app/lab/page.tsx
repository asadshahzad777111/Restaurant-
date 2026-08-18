import Link from "next/link";
import styles from "./lab.module.css";

const LINKS = [
  { href: "/", label: "Marketing home", note: "ORDO landing" },
  { href: "/super", label: "Super Admin", note: "super / super123" },
  { href: "/login", label: "Staff login", note: "DEMO · admin / admin123" },
  { href: "/order?tenant=DEMO", label: "Guest hub", note: "Pick mode" },
  { href: "/order?tenant=DEMO&table=7", label: "Table 7 QR", note: "Pay at counter" },
  { href: "/order?tenant=DEMO&mode=pickup", label: "Pickup", note: "Counter or advance" },
  { href: "/order?tenant=DEMO&mode=delivery", label: "Delivery", note: "COD or advance" },
  { href: "/home", label: "Staff Home", note: "After login" },
  { href: "/pos", label: "POS", note: "Counter sales" },
  { href: "/orders", label: "Orders", note: "Advance status" },
  { href: "/kitchen", label: "Kitchen", note: "Tickets" },
  { href: "/menu", label: "Menu admin", note: "Deals + items" },
  { href: "/settings", label: "Settings", note: "Logo · staff · stock · QR" },
];

export default function LabPage() {
  return (
    <div className={styles.page}>
      <header>
        <p className={styles.brand}>ORDO</p>
        <h1>Lab — demo links</h1>
        <p className={styles.sub}>
          Review path: guest order → staff marks Completed on Orders → open track link → stars form.
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
