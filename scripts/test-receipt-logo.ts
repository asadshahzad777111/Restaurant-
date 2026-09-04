/**
 * Guardrail: 58mm circular logos must print LARGE (not the old 128-dot speck)
 * and must not come out as a black slab.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LOGO_BOX_H,
  LOGO_BOX_W,
  RECEIPT_PAPER_DOTS,
  cropLogoContent,
  fitLogoInBox,
  gsV0InkStats,
  rasterizeLogoRgba,
} from "../src/lib/receipt-logo-raster.ts";

function rgba(w: number, h: number, fill: [number, number, number, number]): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return data;
}

test("contain box is ~320 dots, not the old 128-tall speck", () => {
  assert.equal(LOGO_BOX_W, 320);
  assert.equal(LOGO_BOX_H, 320);
  const square = fitLogoInBox(800, 800);
  assert.equal(square.dw, 320);
  assert.equal(square.dh, 320);
  assert.ok(square.dh > 200, `circular logo height ${square.dh} still looks like the 128 cap`);
  const wide = fitLogoInBox(800, 200);
  assert.ok(wide.dw >= 280 && wide.dw <= 360);
  assert.ok(wide.dh < LOGO_BOX_H || wide.dw === LOGO_BOX_W);
});

test("white-bg colorful circular PNG raster is mostly paper, with a dark ring, ~320 tall", () => {
  const w = 220;
  const h = 220;
  const data = rgba(w, h, [255, 255, 255, 255]);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const outer = 88;
  const inner = 62;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r <= outer && r >= inner) {
        const o = (y * w + x) * 4;
        data[o] = 220;
        data[o + 1] = 40;
        data[o + 2] = 30;
        data[o + 3] = 255;
      }
    }
  }
  const crop = cropLogoContent(data, w, h);
  assert.ok(crop.w < w || crop.h < h || crop.w > 100, "crop should keep the ring");
  const bytes = rasterizeLogoRgba(data, w, h);
  const stats = gsV0InkStats(bytes);
  assert.equal(stats.width, RECEIPT_PAPER_DOTS);
  assert.ok(
    stats.height >= 280 && stats.height <= 360,
    `expected ~320-dot tall circle, got ${stats.height}`,
  );
  assert.ok(stats.inkRatio < 0.45, `black slab? inkRatio=${stats.inkRatio.toFixed(3)}`);
  assert.ok(stats.inkRatio > 0.04, `missing ring? inkRatio=${stats.inkRatio.toFixed(3)}`);
});
