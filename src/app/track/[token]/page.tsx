"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./track.module.css";

interface TrackData {
  branding: { name: string; logoUrl: string };
  code: string;
  shop: { currency: string; phone: string };
  order: {
    number: number;
    status: string;
    statusHistory: { status: string; at: string; note?: string }[];
    serviceType: string;
    paymentMethod: string;
    paymentStatus: string;
    lines: { name: string; qty: number; unitPrice: number; modifiers?: { optionName: string }[] }[];
    total: number;
    tableNumber?: string;
    cancelReason?: string;
    fees?: {
      subtotal: number;
      deliveryFee: number;
      packingFee: number;
      serviceCharge: number;
      tax: number;
    };
  };
  review: { rating: number; comment: string } | null;
  canReview: boolean;
}

const STEPS = [
  { id: "placed", label: "New", hint: "We got your order" },
  { id: "accepted", label: "Accepted", hint: "Restaurant confirmed" },
  { id: "preparing", label: "Preparing", hint: "Kitchen is cooking" },
  { id: "ready", label: "Ready", hint: "Come collect at counter" },
  { id: "out_for_delivery", label: "On the way", hint: "Rider is coming" },
  { id: "completed", label: "Done", hint: "Enjoy your meal" },
] as const;

const BANNER: Record<string, { text: string; tag: string }> = {
  placed: { text: "We received your order", tag: "NEW" },
  accepted: { text: "Restaurant accepted your order", tag: "ACCEPTED" },
  preparing: { text: "Kitchen started preparing your order", tag: "PREPARING" },
  ready: { text: "Your order is ready", tag: "READY" },
  out_for_delivery: { text: "Rider is on the way", tag: "DELIVERY" },
  completed: { text: "Order completed — enjoy!", tag: "DONE" },
  cancelled: { text: "This order was cancelled", tag: "CANCELLED" },
};

function money(currency: string, n: number) {
  return currency === "PKR" ? `Rs ${n.toLocaleString()}` : `${currency} ${n}`;
}

function stepIndex(status: string) {
  if (status === "cancelled") return -1;
  const map: Record<string, number> = {
    placed: 0,
    accepted: 1,
    preparing: 2,
    ready: 3,
    out_for_delivery: 4,
    completed: 5,
  };
  return map[status] ?? 0;
}

export default function TrackPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  async function load() {
    const res = await fetch(`/api/track/${token}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Not found");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackToken: token, rating, comment }),
    });
    if (res.ok) {
      setSent(true);
      await load();
    }
  }

  if (error)
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p>{error}</p>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p>Loading…</p>
        </div>
      </div>
    );

  const current = stepIndex(data.order.status);
  const banner = BANNER[data.order.status] || BANNER.placed;
  const visibleSteps = STEPS.filter((s) => {
    if (data.order.serviceType === "delivery") return true;
    return s.id !== "out_for_delivery";
  });
  const historyAt = Object.fromEntries(
    data.order.statusHistory.map((h) => [h.status, h.at]),
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}>{data.branding.name}</p>
        <h1>Order #{data.order.number}</h1>
        <p className={styles.sub}>
          {data.order.serviceType === "table"
            ? `Table ${data.order.tableNumber || "—"}`
            : data.order.serviceType}{" "}
          ·{" "}
          {data.order.paymentMethod.replaceAll("_", " ")}
        </p>

            <div className={styles.banner} data-cancelled={data.order.status === "cancelled" ? "1" : "0"}>
          <span>
            {data.order.status === "cancelled"
              ? `Cancelled / void${data.order.cancelReason ? `: ${data.order.cancelReason}` : ""}`
              : banner.text}
          </span>
          <em>{banner.tag}</em>
        </div>

        {data.order.status !== "completed" && data.order.status !== "cancelled" && (
          <div className={styles.live}>
            <span className={styles.pulse} />
            <span>Watching for kitchen updates…</span>
          </div>
        )}

        <ol className={styles.timeline}>
          {visibleSteps.map((step, i) => {
            const done = current > i || data.order.status === step.id;
            const active = data.order.status === step.id;
            const at = historyAt[step.id];
            return (
              <li
                key={step.id}
                className={active ? styles.stepOn : done ? styles.stepDone : styles.step}
              >
                <span className={styles.dot} />
                <div>
                  <strong>{step.label}</strong>
                  <p>
                    {step.hint}
                    {at ? ` · ${new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className={styles.summary}>
          {data.order.lines.map((l, i) => (
            <div key={i} className={styles.line}>
              <span>
                {l.qty}x {l.name}
                {(l.modifiers || []).map((m) => (
                  <small key={m.optionName} style={{ display: "block", color: "#8a8790" }}>
                    + {m.optionName}
                  </small>
                ))}
              </span>
              <span>{money(data.shop.currency, l.unitPrice * l.qty)}</span>
            </div>
          ))}
          {data.order.fees && (
            <>
              {data.order.fees.packingFee > 0 && (
                <div className={styles.line}>
                  <span>Packing</span>
                  <span>{money(data.shop.currency, data.order.fees.packingFee)}</span>
                </div>
              )}
              {data.order.fees.deliveryFee > 0 && (
                <div className={styles.line}>
                  <span>Delivery</span>
                  <span>{money(data.shop.currency, data.order.fees.deliveryFee)}</span>
                </div>
              )}
              {data.order.fees.tax > 0 && (
                <div className={styles.line}>
                  <span>GST/Tax</span>
                  <span>{money(data.shop.currency, data.order.fees.tax)}</span>
                </div>
              )}
            </>
          )}
          <div className={styles.total}>
            <strong>Total</strong>
            <strong>{money(data.shop.currency, data.order.total)}</strong>
          </div>
        </div>

        <p className={styles.hint}>
          Keep this page open. After place, changes go through staff only.
        </p>

        {data.canReview && !sent && (
          <form className={styles.review} onSubmit={submitReview}>
            <h2>How was your meal?</h2>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n <= rating ? styles.starOn : styles.star}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="Optional comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <button type="submit" className={styles.reviewBtn}>
              Submit review
            </button>
          </form>
        )}

        {(data.review || sent) && (
          <p className={styles.thanks}>
            Thanks for the {data.review?.rating || rating}★ review.
          </p>
        )}

        <Link href={`/order?tenant=${data.code}`} className={styles.newOrder}>
          New order
        </Link>
      </div>
    </div>
  );
}
