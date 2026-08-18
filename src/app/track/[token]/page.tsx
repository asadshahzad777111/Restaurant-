"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./track.module.css";

interface TrackData {
  branding: { name: string; logoUrl: string };
  shop: { currency: string; phone: string };
  order: {
    number: number;
    status: string;
    statusHistory: { status: string; at: string }[];
    serviceType: string;
    paymentMethod: string;
    paymentStatus: string;
    lines: { name: string; qty: number; unitPrice: number }[];
    total: number;
    tableNumber?: string;
  };
  review: { rating: number; comment: string } | null;
  canReview: boolean;
}

const LABELS: Record<string, string> = {
  placed: "Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

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
    const id = setInterval(() => void load(), 5000);
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
        <p>{error}</p>
      </div>
    );
  if (!data)
    return (
      <div className={styles.page}>
        <p>Loading…</p>
      </div>
    );

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.brand}>{data.branding.name}</p>
        <h1>Order #{data.order.number}</h1>
        <p className={styles.status}>{LABELS[data.order.status] || data.order.status}</p>
      </header>

      <ol className={styles.timeline}>
        {data.order.statusHistory.map((h, i) => (
          <li key={`${h.status}-${i}`}>
            <strong>{LABELS[h.status] || h.status}</strong>
            <span>{new Date(h.at).toLocaleTimeString()}</span>
          </li>
        ))}
      </ol>

      <section className={styles.box}>
        <h2>Items</h2>
        <ul>
          {data.order.lines.map((l, i) => (
            <li key={i}>
              <span>
                {l.qty}× {l.name}
              </span>
              <span>
                {data.shop.currency} {l.unitPrice * l.qty}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          Total · {data.shop.currency} {data.order.total}
        </p>
        <p className={styles.meta}>
          {data.order.serviceType}
          {data.order.tableNumber ? ` · Table ${data.order.tableNumber}` : ""} ·{" "}
          {data.order.paymentMethod.replaceAll("_", " ")} · {data.order.paymentStatus}
        </p>
      </section>

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
          <button type="submit">Submit review</button>
        </form>
      )}

      {(data.review || sent) && (
        <p className={styles.thanks}>Thanks for the {data.review?.rating || rating}★ review.</p>
      )}
    </div>
  );
}
