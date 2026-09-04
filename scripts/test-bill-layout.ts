import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultBillLayout,
  paperColsFor,
  paperDotsFor,
  sanitizeBillLayout,
} from "../src/lib/bill-layout.ts";

test("factory 58mm layout: readable centered logo, 32 cols", () => {
  const d = defaultBillLayout(58);
  assert.equal(d.paperMm, 58);
  assert.equal(paperDotsFor(58), 384);
  assert.equal(paperColsFor(58), 32);
  assert.ok(d.logoDots >= 280 && d.logoDots <= 320);
  assert.equal(d.qrDots, 240);
  assert.equal(d.blocks.find((b) => b.id === "logo")?.align, "center");
  assert.equal(d.blocks.find((b) => b.id === "qr")?.align, "center");
  assert.equal(d.blocks[0].id, "logo");
});

test("80mm reflow uses 576 dots / 48 cols, not a stretched 58mm page", () => {
  const d = sanitizeBillLayout({ paperMm: 80, logoDots: 320, qrDots: 240 });
  assert.equal(d.paperMm, 80);
  assert.equal(paperDotsFor(80), 576);
  assert.equal(paperColsFor(80), 48);
  assert.ok(d.logoDots <= 552);
});

test("logo/QR stay centered even if a client sends left", () => {
  const d = sanitizeBillLayout({
    blocks: [
      { id: "logo", on: true, align: "left" },
      { id: "qr", on: true, align: "left" },
    ],
  });
  assert.equal(d.blocks.find((b) => b.id === "logo")?.align, "center");
  assert.equal(d.blocks.find((b) => b.id === "qr")?.align, "center");
});
