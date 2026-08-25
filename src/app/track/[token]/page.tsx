"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { modeLabel, trackSteps, guestOrderPath } from "@/lib/guest";
import { guestWhatsappLink } from "@/lib/whatsapp";
import { GuestCoverQr } from "@/components/GuestCoverQr";
import {
  backdropTransition,
  listContainer,
  listItem,
  pageEnter,
  useIsCoarsePointer,
  usePrefersReducedMotion,
} from "@/lib/motion";
import styles from "./track.module.css";

interface TrackData {
  branding: { name: string; logoUrl: string };
  code: string;
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

function isReadyStatus(status: string) {
  return status === "ready" || status === "out_for_delivery";
}

export default function TrackPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [readyOpen, setReadyOpen] = useState(false);
  const prevStatus = useRef<string | null>(null);
  const notified = useRef(false);
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

  useEffect(() => {
    if (!data) return;
    const status = data.order.status;
    const was = prevStatus.current;
    prevStatus.current = status;

    if (!isReadyStatus(status)) return;

    const becameReady = was !== null && !isReadyStatus(was);
    const firstLoadReady = was === null;
    if (!becameReady && !firstLoadReady) return;

    setReadyOpen(true);

    if (!becameReady || notified.current) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    notified.current = true;
    const body = `${data.branding.name} · #${data.order.number}`;
    const fire = () => {
      try {
        new Notification("Your order is ready", { body });
      } catch {
        /* ignore */
      }
    };
    if (Notification.permission === "granted") fire();
    else if (Notification.permission === "default") {
      void Notification.requestPermission().then((perm) => {
        if (perm === "granted") fire();
      });
    }
  }, [data]);

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
  function saveReceipt() {
    if (!data) return;
    const rows = (data.order.lines || [])
      .map((l) => `<tr><td>${escapeHtml(l.name)} x ${l.qty}</td><td class="r">${data.shop.currency} ${l.unitPrice * l.qty}</td></tr>`)
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
      body{font:13px monospace;color:#000;margin:18px auto;width:280px;}
      h1{font-size:15px;text-align:center;margin:0;} .c{text-align:center;}
      hr{border:none;border-top:1px dashed #000;margin:8px 0;}
      table{width:100%;border-collapse:collapse;} td{padding:2px 0;} td.r{text-align:right;}
      .t{font-weight:700;font-size:14px;} .m{font-size:11px;color:#333;}
    </style></head><body>
    <h1>${escapeHtml(data.branding.name)}</h1>
    <p class="c m">${escapeHtml(data.shop.phone || "")}</p>
    <hr/>
    <p class="m">Bill #${data.order.number} · ${modeLabel(data.order.serviceType)}</p>
    <hr/>
    <table>${rows}</table>
    <hr/>
    <p class="t">TOTAL${" ".repeat(6)}${data.shop.currency} ${data.order.total}</p>
    <p class="m">${escapeHtml(data.order.paymentMethod.replaceAll("_", " "))} · ${data.order.paymentStatus}</p>
    <hr/>
    <p class="c m">Thank you</p><p class="c m">Visit again</p>
    </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    }
  }

  function escapeHtml(s: string) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
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
        <p className={styles.meta} style={{ marginTop: "0.75rem" }}>
          <a
            href={guestWhatsappLink(
              `ORDO order #${data.order.number} at ${data.branding.name} — status: ${LABELS[current] || current}. Track: ${typeof window !== "undefined" ? window.location.href : ""}`,
              data.shop.phone,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Share status on WhatsApp
          </a>
        </p>
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
        <button type="button" className={styles.saveReceipt} onClick={saveReceipt}>
          📥 Save receipt (PDF)
        </button>
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

      <GuestCoverQr tenantCode={data.code} restaurantName={data.branding.name} />

      <p className={styles.footerNav}>
        <Link
          href={guestOrderPath({
            tenant: data.code,
            mode:
              data.order.serviceType === "pickup"
                ? "pickup"
                : data.order.serviceType === "delivery"
                  ? "delivery"
                  : undefined,
          })}
        >
          Order again
        </Link>
        <Link href="/guest">Find a restaurant</Link>
      </p>

      <AnimatePresence>
        {readyOpen ? (
          <motion.div
            key="ready-alert"
            className={styles.readyBackdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ready-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition(reduced)}
            onClick={() => setReadyOpen(false)}
          >
            <motion.div
              className={styles.readyCard}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={backdropTransition(reduced)}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.readyClose}
                aria-label="Close"
                onClick={() => setReadyOpen(false)}
              >
                ×
              </button>
              <p className={styles.readyEyebrow}>{data.branding.name}</p>
              <h2 id="ready-title">Your order is ready</h2>
              <p className={styles.muted}>
                #{data.order.number}
                {current === "out_for_delivery"
                  ? " is on the way."
                  : data.order.serviceType === "delivery"
                    ? " — please wait for the rider."
                    : " — you can collect it now."}
              </p>
              <button type="button" className={styles.readyOk} onClick={() => setReadyOpen(false)}>
                Got it
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
