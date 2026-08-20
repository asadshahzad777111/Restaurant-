import Link from "next/link";
import styles from "./lab.module.css";

/** Internal / local demo hub — not linked from public marketing. */
const GUEST = [
  { href: "/order?tenant=DEMO", label: "Guest menu", note: "Main demo" },
  { href: "/order?tenant=DEMO&table=3", label: "Table 3 QR", note: "Dine-in" },
  { href: "/order?tenant=DEMO&mode=pickup", label: "Pickup", note: "Counter collect" },
  { href: "/order?tenant=DEMO&mode=delivery", label: "Delivery", note: "Address + COD" },
];

const PRIVATE = [
  { href: "/staff", label: "Restaurant staff access", note: "Separate login page — share privately" },
  { href: "/login?owner=1", label: "ORDO HQ (owner)", note: "You only — not for clients" },
];

export default function LabPage() {
  return (
    <div className={styles.page}>
      <header>
        <p className={styles.brand}>ORDO</p>
        <h1>Internal demo hub</h1>
        <p className={styles.sub}>
          Not linked from the public homepage. Guests use the demo menu; staff get a private /staff link.
        </p>
      </header>
      <h2 style={{ fontSize: "1rem", margin: "1.5rem 0 0.5rem" }}>Guest demos</h2>
      <ul className={styles.list}>
        {GUEST.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>
              <strong>{l.label}</strong>
              <span>{l.note}</span>
              <code>{l.href}</code>
            </Link>
          </li>
        ))}
      </ul>
      <h2 style={{ fontSize: "1rem", margin: "1.5rem 0 0.5rem" }}>Private access (do not put on demo site)</h2>
      <ul className={styles.list}>
        {PRIVATE.map((l) => (
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
