"use client";

import { useEffect } from "react";

/** Catches client crashes so iPhone Safari does not replace the app with its native “couldn't load” page. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        background: "#f7f4ef",
        color: "#171411",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div>
        <p style={{ letterSpacing: "0.12em", fontWeight: 700, opacity: 0.55, margin: 0 }}>ORDO</p>
        <h1 style={{ fontSize: "1.45rem", margin: "0.6rem 0" }}>This screen hit a snag</h1>
        <p style={{ opacity: 0.75, margin: "0 0 1.1rem" }}>Reload to try again, or go back to Home.</p>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.62rem 1.15rem",
              borderRadius: 999,
              border: 0,
              background: "#171411",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Reload
          </button>
          <a
            href="/home"
            style={{
              padding: "0.62rem 1.15rem",
              borderRadius: 999,
              border: "1px solid #ddd6cc",
              background: "#fff",
              color: "#171411",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Back
          </a>
        </div>
      </div>
    </div>
  );
}
