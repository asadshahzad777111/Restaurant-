import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant, placeOrder } from "../api";
import type { Tenant, MenuItem, Order } from "../types";
import { ReceiptView } from "../components/ReceiptView";
import { theme, radius } from "../theme";

type Line = { key: string; item: MenuItem; qty: number };

export function POSScreen() {  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<Line[]>([]);
  const [pay, setPay] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await getTenant();
      setTenant(d.tenant);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const cats = useMemo(() => {
    const s = new Set((tenant?.menu || []).map((m) => (m.isDeal ? "Deals" : m.category)));
    return ["All", ...[...s]];
  }, [tenant?.menu]);

  const items = useMemo(() => {
    const all = tenant?.menu || [];
    if (cat === "All") return all;
    if (cat === "Deals") return all.filter((m) => m.isDeal || m.category === "Deals");
    return all.filter((m) => !m.isDeal && m.category === cat);
  }, [tenant?.menu, cat]);

  const total = cart.reduce((s, l) => s + l.item.price * l.qty, 0);

  function add(item: MenuItem) {
    if (!item.available) {
      setMsg(`${item.name} is 86`);
      return;
    }
    setCart((prev) => {
      const hit = prev.find((p) => p.key === item.id);
      if (hit) return prev.map((p) => (p.key === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { key: item.id, item, qty: 1 }];
    });
  }

  function bump(key: string, d: number) {
    setCart((prev) =>
      prev.flatMap((p) => {
        if (p.key !== key) return [p];
        const q = p.qty + d;
        return q <= 0 ? [] : [{ ...p, qty: q }];
      }),
    );
  }

  async function charge() {
    if (!cart.length) {
      setMsg("Cart is empty");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const order = await placeOrder({
        serviceType: "counter",
        paymentMethod: pay,
        lines: cart.map((l) => ({
          itemId: l.item.id,
          name: l.item.name,
          qty: l.qty,
          unitPrice: l.item.price,
        })),
      });
      setCart([]);
      setMsg(`Order #${order.number} placed`);
      setLastOrder(order);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.container}>
      {/* category chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={cats}
        keyExtractor={(c) => c}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.chip, cat === item && s.chipOn]} onPress={() => setCat(item)}>
            <Text style={[s.chipText, cat === item && s.chipTextOn]}>{item}</Text>
          </TouchableOpacity>
        )}
      />
      {err ? <Text style={s.err}>{err}</Text> : null}

      <View style={s.body}>
        {/* items grid */}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item }) => {
            const qty = cart.find((l) => l.item.id === item.id)?.qty || 0;
            return (
              <TouchableOpacity style={s.item} onPress={() => add(item)}>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemPrice}>
                  {tenant?.shop.currency} {item.price}
                </Text>
                {qty > 0 && (
                  <View style={s.itemQty}>
                    <TouchableOpacity onPress={() => bump(item.id, -1)}>
                      <Text style={s.qtyBtn}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyN}>{qty}</Text>
                    <TouchableOpacity onPress={() => bump(item.id, 1)}>
                      <Text style={s.qtyBtn}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* charge panel */}
        <View style={s.panel}>
          <Text style={s.panelQty}>{cart.length} items</Text>
          <Text style={s.panelTotal}>
            {tenant?.shop.currency} {total}
          </Text>
          <View style={s.payRow}>
            {["cash", "card", "wallet"].map((p) => (
              <TouchableOpacity
                key={p}
                style={[s.payChip, pay === p && s.payChipOn]}
                onPress={() => setPay(p)}
              >
                <Text style={[s.payText, pay === p && s.payTextOn]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={s.charge}
            onPress={() => void charge()}
            disabled={busy || !cart.length}
          >
            <Text style={s.chargeText}>{busy ? "Placing…" : "Charge"}</Text>
          </TouchableOpacity>
          {msg ? <Text style={s.ok}>{msg}</Text> : null}
        </View>
      </View>
      <ReceiptView visible={!!lastOrder} order={lastOrder} currency={tenant?.shop.currency || "PKR"} onClose={() => setLastOrder(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  err: { color: theme.danger, paddingHorizontal: 12, fontWeight: "600" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
  chipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.ink, fontWeight: "600" },
  chipTextOn: { color: "#fff", fontWeight: "800" },
  body: { flex: 1, flexDirection: "row" },
  item: { flex: 1, backgroundColor: theme.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: theme.line, padding: 10, gap: 4 },
  itemName: { fontSize: 14, fontWeight: "700", color: theme.ink },
  itemPrice: { color: theme.muted, fontSize: 13 },
  itemQty: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  qtyN: { fontWeight: "800", fontSize: 15 },
  panel: { width: 180, backgroundColor: theme.darkSurface, padding: 14, gap: 10, justifyContent: "flex-end" },
  panelQty: { color: "#c9c0b4", fontWeight: "700" },
  panelTotal: { color: "#fff", fontSize: 20, fontWeight: "800" },
  payRow: { flexDirection: "row", gap: 6 },
  payChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  payChipOn: { backgroundColor: "#ff9d2e" },
  payText: { color: "#e8e4dc", fontSize: 12, fontWeight: "700" },
  payTextOn: { color: "#120b07" },
  charge: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  chargeText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ok: { color: "#7fe0ac", fontWeight: "700" },
});
