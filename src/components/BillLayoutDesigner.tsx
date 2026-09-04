"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  BILL_BLOCK_LABEL,
  defaultBillLayout,
  dotsToMm,
  graphicIsCentered,
  logoDotsRange,
  moveBillBlock,
  paperColsFor,
  paperDotsFor,
  qrDotsRange,
  resolveBillLayout,
  sanitizeBillLayout,
  type BillAlign,
  type BillLayout,
  type BillPaperMm,
} from "@/lib/bill-layout";
import { customerBillHtml, sampleBillOrder } from "@/lib/bill-render";
import styles from "../app/staff.module.css";

export function BillLayoutDesigner() {
  const { tenant, api, applyTenant } = useStore();
  const [layout, setLayout] = useState<BillLayout>(() => resolveBillLayout(tenant?.shop));
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) setLayout(resolveBillLayout(tenant.shop));
  }, [tenant?.id]);

  const previewHtml = useMemo(() => {
    if (!tenant) return "";
    const draft = sanitizeBillLayout(layout);
    return customerBillHtml(tenant, sampleBillOrder({ ...tenant, shop: { ...tenant.shop, billLayout: draft } }), draft);
  }, [tenant, layout]);

  if (!tenant) return null;

  const logoR = logoDotsRange(layout.paperMm);
  const qrR = qrDotsRange(layout.paperMm);
  const paperW = layout.paperMm;

  function setPaper(mm: BillPaperMm) {
    setLayout((cur) => sanitizeBillLayout({ ...cur, paperMm: mm }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const clean = sanitizeBillLayout(layout);
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "billLayout", shop: { billLayout: clean } }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    setMsg(res.ok ? "Bill layout saved — every print uses this" : (data as { error?: string }).error || "Save failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
      setLayout(resolveBillLayout((data as { tenant: NonNullable<typeof tenant> }).tenant.shop));
    }
  }

  function reset() {
    setLayout(defaultBillLayout(58));
    setMsg("Reset to factory layout (not saved yet)");
  }

  return (
    <div className={styles.billDesigner}>
      <form
        className={styles.form}
        style={{ maxWidth: "none" }}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h3 style={{ margin: 0 }} id="bill-layout">
          🖨️ Printer / Bill layout
        </h3>
        <p className={styles.muted} style={{ margin: 0 }}>
          Exact {paperW}mm page ({paperDotsFor(paperW)} dots, {paperColsFor(paperW)} columns). Logo and QR stay
          centered. Save once — this kitchen only. Pair the Bluetooth printer in the Printer card on this page.
        </p>

        <div className={styles.billPaperRow} role="radiogroup" aria-label="Paper width">
          <label className={layout.paperMm === 58 ? styles.billPaperOn : styles.billPaper}>
            <input type="radio" name="paper" checked={layout.paperMm === 58} onChange={() => setPaper(58)} />
            58mm
          </label>
          <label className={layout.paperMm === 80 ? styles.billPaperOn : styles.billPaper}>
            <input type="radio" name="paper" checked={layout.paperMm === 80} onChange={() => setPaper(80)} />
            80mm
          </label>
        </div>

        <label className={styles.muted}>
          Logo size ({layout.logoDots} dots ≈ {dotsToMm(layout.logoDots)}mm, centered)
          <input
            type="range"
            min={logoR.min}
            max={logoR.max}
            step={8}
            value={layout.logoDots}
            onChange={(e) => setLayout({ ...layout, logoDots: Number(e.target.value) })}
          />
        </label>
        <label className={styles.muted}>
          QR / scanner size ({layout.qrDots} dots ≈ {dotsToMm(layout.qrDots)}mm, centered)
          <input
            type="range"
            min={qrR.min}
            max={qrR.max}
            step={8}
            value={layout.qrDots}
            onChange={(e) => setLayout({ ...layout, qrDots: Number(e.target.value) })}
          />
        </label>
        <label className={styles.muted}>
          Shop name size ({layout.headerScale}%)
          <input
            type="range"
            min={80}
            max={140}
            step={5}
            value={layout.headerScale}
            onChange={(e) => setLayout({ ...layout, headerScale: Number(e.target.value) })}
          />
        </label>
        <textarea
          value={layout.extraFooter}
          onChange={(e) => setLayout({ ...layout, extraFooter: e.target.value })}
          placeholder="Extra footer lines on the bill"
          rows={2}
        />

        <p className={styles.settingsGroupTitle}>Blocks (up / down = print order)</p>
        <div className={styles.billBlockList}>
          {layout.blocks.map((b, i) => (
            <div key={b.id} className={styles.billBlockRow}>
              <label className={styles.rowCheck} style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={b.on}
                  onChange={(e) => {
                    const blocks = layout.blocks.slice();
                    blocks[i] = { ...b, on: e.target.checked };
                    setLayout({ ...layout, blocks });
                  }}
                />
                {BILL_BLOCK_LABEL[b.id]}
              </label>
              {graphicIsCentered(b.id) ? (
                <span className={styles.muted}>center</span>
              ) : (
                <button
                  type="button"
                  className={styles.billMini}
                  onClick={() => {
                    const blocks = layout.blocks.slice();
                    const next: BillAlign = b.align === "center" ? "left" : "center";
                    blocks[i] = { ...b, align: next };
                    setLayout({ ...layout, blocks });
                  }}
                >
                  {b.align === "center" ? "Center" : "Left"}
                </button>
              )}
              <button
                type="button"
                className={styles.billMini}
                disabled={i === 0}
                onClick={() => setLayout({ ...layout, blocks: moveBillBlock(layout.blocks, i, -1) })}
              >
                Up
              </button>
              <button
                type="button"
                className={styles.billMini}
                disabled={i === layout.blocks.length - 1}
                onClick={() => setLayout({ ...layout, blocks: moveBillBlock(layout.blocks, i, 1) })}
              >
                Down
              </button>
            </div>
          ))}
        </div>

        <div className={styles.billActions}>
          <button type="submit" className={styles.btn} disabled={saving}>
            {saving ? "Saving…" : "Save layout"}
          </button>
          <button type="button" className={styles.btnGhost} onClick={reset}>
            Reset to default
          </button>
        </div>
        {msg ? <p className={styles.muted} style={{ margin: 0 }}>{msg}</p> : null}
      </form>

      <div className={styles.billPreviewWrap}>
        <p className={styles.settingsGroupTitle}>Live {paperW}mm preview</p>
        <div className={styles.billPreviewFrame} style={{ width: `${paperW}mm` }}>
          <iframe title="Bill preview" className={styles.billPreviewFrameIframe} srcDoc={previewHtml} />
        </div>
      </div>
    </div>
  );
}
