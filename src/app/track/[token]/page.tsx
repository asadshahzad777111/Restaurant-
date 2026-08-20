"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { modeLabel, trackSteps } from "@/lib/guest";
import {
  listContainer,
  listItem,
  pageEnter,
  useIsCoarsePointer,
  usePrefersReducedMotion,
} from "@/lib/motion";
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
  const [reviewError, setReviewError] = useState("");
  const reduced = usePrefersReducedMotion();
  const coarse = useIsCoarsePointer();
  const enter = pageEnter(reduced, coarse);
  const stepVar = listItem(reduced, coarse);

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
    setReviewError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackToken: token, rating, comment }),
    });
    const json = await res.json();
    if (!res.ok) {
      setReviewError(json.error || "Could not save review");
      return;
    }
    setSent(true);
    await load();
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.fail}>{error}</p>
        <Link href="/guest">Find a restaurant</Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Loading live ticket…</p>
      </div>
    );
  }

  const current = data.order.status;
  const steps =
    current === "cancelled" ? data.order.statusHistory.map((h) => h.status) : trackSteps(data.order.serviceType);

  return (
    <motion.div className={styles.page} variants={enter} initial="hidden" animate="show">
      <header>
        <p className={styles.brand}>{data.branding.name}</p>
        <h1>Order #{data.order.number}</h1>
        <p className={current === "cancelled" ? styles.statusBad : styles.status}>
          {LABELS[current] || current}
        </p>
        <p className={styles.live}>Updates every few seconds from this kitchen.</p>
      </header>

      <motion.ol
        className={styles.timeline}
        variants={listContainer(0.05)}
        initial="hidden"
        animate="show"
      >
        {steps.map((step) => {
          const hit = data.order.statusHistory.find((h) => h.status === step);
          const state = step === current ? "now" : hit ? "done" : "wait";
          return (
            <motion.li key={step} data-state={state} variants={stepVar}>
              <strong>{LABELS[step] || step}</strong>
              <span>{hit ? new Date(hit.at).toLocaleTimeString() : state === "now" ? "Now" : "—"}</span>
            </motion.li>
          );
        })}
      </motion.ol>

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
          {modeLabel(data.order.serviceType)}
          {data.order.tableNumber ? ` · Table ${data.order.tableNumber}` : ""} ·{" "}
          {data.order.paymentMethod.replaceAll("_", " ")} · {data.order.paymentStatus}
        </p>
      </section>

      {data.canReview && !sent && (
        <form className={styles.review} onSubmit={(e) => void submitReview(e)}>
          <h2>How was your meal?</h2>
          <p className={styles.muted}>Reviews unlock after staff marks the order completed.</p>
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={n <= rating ? styles.starOn : styles.star}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
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
          {reviewError && <p className={styles.fail}>{reviewError}</p>}
          <button type="submit">Submit review</button>
        </form>
      )}

      {(data.review || sent) && (
        <p className={styles.thanks}>Thanks for the {data.review?.rating || rating}★ review.</p>
      )}

      <p className={styles.footerNav}>
        <Link href="/guest">Order again</Link>
      </p>
    </motion.div>
  );
}
