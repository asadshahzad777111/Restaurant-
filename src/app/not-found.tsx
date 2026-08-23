import Link from "next/link";

/** Branded 404 — dark theme, on-brand, with useful exits. */
export default function NotFound() {
  const btn = {
    padding: "0.62rem 1.1rem",
    borderRadius: "999px",
    fontWeight: 700,
    fontSize: "0.9rem",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
  } as const;
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(900px 400px at 50% -20%, rgba(255,133,0,0.16), transparent 60%), #171411",
        color: "#f7f4ef",
        textAlign: "center",
        padding: "1.5rem",
      }}
    >
      <div>
        <p style={{ opacity: 0.55, letterSpacing: "0.12em", fontWeight: 700, margin: 0 }}>ORDO</p>
        <h1 style={{ fontSize: "3.6rem", margin: "0.4rem 0", fontFamily: "var(--display, serif)", fontWeight: 800 }}>
          404
        </h1>
        <p style={{ opacity: 0.8, margin: "0 0 1.2rem" }}>Yeh page nahi mila — wapas chalte hain.</p>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{ ...btn, background: "#ff8500", color: "#120b07" }}
          >
            ← Home
          </Link>
          <Link
            href="/order?tenant=DEMO"
            style={{ ...btn, border: "1px solid #5a5148", color: "#f7f4ef" }}
          >
            Live demo
          </Link>
          <Link
            href="/scan"
            style={{ ...btn, border: "1px solid #5a5148", color: "#f7f4ef" }}
          >
            Scanner
          </Link>
        </div>
      </div>
    </div>
  );
}
