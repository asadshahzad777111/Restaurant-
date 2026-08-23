import { useCallback, useEffect, useRef, useState } from "react";
import { getOrders } from "../api";
import { notifyNewOrder } from "../notify";
import type { Order } from "../types";

/** Polls /api/orders and reports orders that newly reach "placed". */
export function useNewOrders(intervalMs = 4000) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const dismissed = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const list = await getOrders();
      setOrders(list);
      if (!primed.current) {
        list.forEach((o) => seen.current.add(o.id));
        primed.current = true;
        return;
      }
      const fresh = list.filter(
        (o) => o.status === "placed" && !seen.current.has(o.id) && !dismissed.current.has(o.id),
      );
      fresh.forEach((o) => {
        seen.current.add(o.id);
        dismissed.current.add(o.id);
      });
      if (fresh.length) {
        setNewOrders((prev) => [...prev, ...fresh].slice(-6));
        const first = fresh[0];
        void notifyNewOrder(first.number, `${first.serviceType} · ${first.lines.length} items`);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  const dismiss = useCallback((id: string) => {
    setNewOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return { orders, setOrders, newOrders, dismiss };
}
