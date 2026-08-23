import type { OrderLine, StockItem } from "./tenant-types";

/**
 * Apply a stock movement for an order's lines and return the adjusted stock list.
 * `delta` is per unit: -1 to deduct (sale), +1 to restore (cancel).
 * Stock rows are matched by item name (case-insensitive), matching the 86 check.
 */
export function applyStockMovement(
  stock: StockItem[],
  lines: OrderLine[],
  delta: -1 | 1,
): StockItem[] {
  if (!lines.length) return stock;
  return stock.map((s) => {
    let change = 0;
    for (const l of lines) {
      if (l.name.trim().toLowerCase() === s.name.trim().toLowerCase()) {
        change += l.qty * delta;
      }
    }
    if (change === 0) return s;
    return { ...s, quantity: Math.max(0, s.quantity + change) };
  });
}
