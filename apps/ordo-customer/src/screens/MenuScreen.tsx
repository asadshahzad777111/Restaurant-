import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { getMenu } from "../api";
import type { PublicMenu, MenuItem } from "../types";
import { theme } from "../theme";

type CartLine = { item: MenuItem; qty: number };

export function MenuScreen({ code, navigation }: any) {
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [err, setErr] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cat, setCat] = useState("All");

  const load = useCallback(async () => {
    try {
      setMenu(await getMenu(code));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load error");
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  const cats = useMemo(() => {
    const s = new Set((menu?.menu || []).map((m) => (m.isDeal ? "Deals" : m.category)));
    return ["All", ...[...s]];
  }, [menu?.menu]);
  const items = useMemo(() => {
    const all = menu?.menu || [];
    if (cat === "All") return all;
    if (cat === "Deals") return all.filter((m) => m.isDeal || m.category === "Deals");
    return all.filter((m) => !m.isDeal && m.category === cat);
  }, [menu?.menu, cat]);

  const total = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  function add(item: MenuItem) {
    if (!item.available) return;
    setCart((prev) => {
      const hit = prev.find((p) => p.item.id === item.id);
      if (hit) return prev.map((p) => (p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { item, qty: 1 }];
    });
  }
  function bump(id: string, d: number) {
    setCart((prev) =>
      prev.flatMap((p) => {
        if (p.item.id !== id) return [p];
        const q = p.qty + d;
        return q <= 0 ? [] : [{ ...p, qty: q }];
      }),
    );
  }

  return (
    <View style={s.root}>
      <View style={s.top}>
        <Text style={s.brand}>{menu?.branding.name || "ORDO"}</Text>
        <Text style={s.sub}>{code}</Text>
      </View>
      {err ? <Text style={s.err}>{err}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.cats}>
        {cats.map((c) => (
          <TouchableOpacity key={c} style={[s.chip, cat === c && s.chipOn]} onPress={() => setCat(c)}>
            <Text style={[s.chipText, cat === c && s.chipTextOn]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={s.grid}>
        {items.map((m) => {
          const qty = cart.find((p) => p.item.id === m.id)?.qty || 0;
          return (
            <View key={m.id} style={s.card}>
              <Text style={s.name}>{m.name}</Text>
              {m.description ? <Text style={s.desc}>{m.description}</Text> : null}
              <View style={s.row}>
                <Text style={s.price}>
                  {menu?.shop.currency} {m.price}
                </Text>
                <View style={s.qty}>
                  {qty > 0 && (
                    <TouchableOpacity onPress={() => bump(m.id, -1)}>
                      <Text style={s.qtyBtn}>−</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={s.qtyN}>{qty}</Text>
                  <TouchableOpacity onPress={() => add(m)}>
                    <Text style={s.qtyBtn}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      {count > 0 && (
        <TouchableOpacity
          style={s.cartBar}
          onPress={() => navigation.navigate("Checkout", { menu, cart, total, code })}
        >
          <Text style={s.cartText}>
            {count} item{count > 1 ? "s" : ""} · {menu?.shop.currency} {total}
          </Text>
          <Text style={s.cartCta}>Checkout →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.dark },
  top: { padding: 16, paddingTop: 44, borderBottomWidth: 1, borderBottomColor: theme.line },
  brand: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sub: { color: theme.muted, fontSize: 13 },
  err: { color: theme.danger, padding: 12, fontWeight: "600" },
  cats: { maxHeight: 48, paddingHorizontal: 12, paddingVertical: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: theme.line, marginRight: 8, backgroundColor: theme.darkSurface },
  chipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.text, fontWeight: "600" },
  chipTextOn: { color: "#120b07", fontWeight: "800" },
  grid: { padding: 12, gap: 8, paddingBottom: 90 },
  card: { backgroundColor: theme.darkSurface, borderRadius: 12, borderWidth: 1, borderColor: theme.line, padding: 12 },
  name: { color: theme.text, fontSize: 16, fontWeight: "700" },
  desc: { color: theme.muted, fontSize: 13 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  price: { color: theme.accentHot, fontWeight: "800" },
  qty: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { color: theme.accent, fontSize: 22, fontWeight: "800" },
  qtyN: { color: theme.text, fontWeight: "800" },
  cartBar: { backgroundColor: theme.accent, borderRadius: 999, margin: 12, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cartText: { color: "#120b07", fontWeight: "800", fontSize: 15 },
  cartCta: { color: "#120b07", fontWeight: "900" },
});
