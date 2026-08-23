import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant, toggle86 } from "../api";
import { EmptyState } from "../components/EmptyState";
import type { Tenant, MenuItem } from "../types";
import { theme, radius } from "../theme";

export function MenuScreen({ route }: any) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await getTenant();
      // If the parent passed a fresh tenant, use it; else refetch.
      setTenant(route.params?.tenant || d.tenant);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load error");
    }
  }, [route.params?.tenant]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function toggle(item: MenuItem) {
    try {
      const t = await toggle86(item.id);
      setTenant(t);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  const cats = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    (tenant?.menu || []).forEach((m) => {
      const list = map.get(m.category) || [];
      list.push(m);
      map.set(m.category, list);
    });
    return [...map.entries()];
  }, [tenant?.menu]);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, gap: 18 }}>
      {err ? <Text style={s.err}>{err}</Text> : null}
      {cats.map(([cat, items]) => (
        <View key={cat}>
          <Text style={s.cat}>{cat}</Text>
          {items.map((m) => (
            <View key={m.id} style={[s.item, !m.available && s.itemOff]}>
              <View style={s.itemLeft}>
                <Text style={s.name}>{m.name}</Text>
                <Text style={s.price}>
                  {tenant?.shop.currency} {m.price}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.toggle, !m.available && s.toggleOn]}
                onPress={() => void toggle(m)}
              >
                <Text style={s.toggleText}>{m.available ? "Available" : "86"}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
      {!cats.length ? <EmptyState emoji="📋" title="No menu items yet" hint="Add items from the web Settings → Menu." /> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  err: { color: theme.danger, padding: 12, fontWeight: "600" },
  empty: { color: theme.muted, textAlign: "center", padding: 24 },
  cat: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: theme.muted,
    marginBottom: 8,
  },
  item: {
    backgroundColor: theme.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemOff: { opacity: 0.55 },
  itemLeft: { gap: 2, flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: theme.ink },
  price: { color: theme.muted, fontSize: 13 },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
  },
  toggleOn: { backgroundColor: theme.danger, borderColor: theme.danger },
  toggleText: { color: theme.ink, fontWeight: "700", fontSize: 13 },
});
