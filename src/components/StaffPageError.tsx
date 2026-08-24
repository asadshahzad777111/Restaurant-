"use client";

/** Shared recovery UI when an Admin screen throws (Orders / Day close / Sales). */
export function StaffPageError({
  title,
  reset,
}: {
  title: string;
  reset: () => void;
}) {
  return (
    <div style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <p style={{ letterSpacing: "0.12em", fontWeight: 700, opacity: 0.5, margin: 0 }}>ORDO</p>
      <h1 style={{ fontSize: "1.25rem", margin: "0.55rem 0 0.4rem" }}>{title} couldn’t load</h1>
      <p style={{ color: "#6b645c", margin: "0 0 1rem" }}>
        Reload this screen — you stay signed in. If it still fails, open Home and try again.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: 999,
            border: 0,
            background: "#ff8500",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Reload
        </button>
        <a
          href="/home"
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: 999,
            border: "1px solid #ddd6cc",
            background: "#fff",
            color: "#171411",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Home
        </a>
      </div>
    </div>
  );
}
