"use client";

export default function OrdersError({ reset }: { reset: () => void }) {
  return (
    <div style={{ padding: "1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.2rem", margin: "0 0 0.4rem" }}>Orders couldn’t load</h1>
      <p style={{ color: "#6b645c", margin: "0 0 0.9rem" }}>
        Session hydrate missed this screen. Reload — you will stay signed in.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: "0.55rem 1rem",
          borderRadius: 8,
          border: 0,
          background: "#ff8500",
          color: "#fff",
          fontWeight: 700,
        }}
      >
        Reload Orders
      </button>
    </div>
  );
}
