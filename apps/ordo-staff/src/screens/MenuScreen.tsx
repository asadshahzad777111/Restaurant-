import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant, toggle86 } from "../api";
import { EmptyState } from "../components/EmptyState";
import type { Tenant, MenuItem } from "../types";
import { theme, radius } from "../theme";

export function MenuScreen({ route }: any) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

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
    const query = q.trim().toLowerCase();
    const list = (tenant?.menu || []).filter(
      (m) => !query || m.name.toLowerCase().includes(query) || m.category.toLowerCase().includes(query),
    );
    const map = new Map<string, MenuItem[]>();
    list.forEach((m) => {
      const bucket = map.get(m.category) || [];
      bucket.push(m);
      map.set(m.category, bucket);
    });
    return [...map.entries()];
  }, [tenant?.menu, q]);

  const cur = tenant?.shop.currency || "PKR";
  const loaded = tenant !== null;
  const filteredCount = (tenant?.menu || []).length;

  return (
    <View style={s.container}>
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={q}
          onChangeText={setQ}
          placeholder="Search items…"
          placeholderTextColor={theme.muted}
          autoCorrect={false}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
        {err ? <Text style={s.err}>{err}</Text> : null}
        {!loaded && !err ? <ActivityIndicator color={theme.accent} style={{ margin: 24 }} /> : null}
        {loaded && !filteredCount ? (
          <EmptyState emoji="📋" title="No menu items yet" hint="Add items from the web Settings → Menu." />
        ) : null}
        {loaded && filteredCount > 0 && !cats.length ? (
          <EmptyState emoji="🔍" title="No matches" hint="Nothing matches that search." />
        ) : null}
        {cats.map(([cat, items]) => (
          <View key={cat}>
            <View style={s.catRow}>
              <Text style={s.cat}>{cat}</Text>
              <Text style={s.catCount}>{items.length}</Text>
            </View>
            {items.map((m) => (
              <View key={m.id} style={[s.item, !m.available && s.itemOff]}>
                {m.imageEmoji ? <Text style={s.itemEmoji}>{m.imageEmoji}</Text> : null}
                <View style={s.itemLeft}>
                  <Text style={s.name}>{m.name}</Text>
                  {m.description ? (
                    <Text style={s.desc} numberOfLines={1}>{m.description}</Text>
                  ) : null}
                  <Text style={s.price}>
                    {cur} {m.price.toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.toggle, !m.available && s.toggleOn]}
                  onPress={() => void toggle(m)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.toggleText, !m.available && s.toggleTextOff]}>
                    {m.available ? "Available" : "86"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  search: {
    backgroundColor: theme.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.ink,
    fontSize: 15,
  },
  err: { color: theme.danger, padding: 12, fontWeight: "600" },
  empty: { color: theme.muted, textAlign: "center", padding: 24 },
  cat: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: theme.muted,
  },
  catRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  catCount: { fontSize: 12, fontWeight: "800", color: theme.accent, backgroundColor: "rgba(255,133,0,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
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
    gap: 10,
    shadowColor: "#120b07",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemOff: { opacity: 0.55 },
  itemLeft: { gap: 2, flex: 1 },
  itemEmoji: { fontSize: 26 },
  name: { fontSize: 16, fontWeight: "700", color: theme.ink },
  desc: { color: theme.muted, fontSize: 12 },
  price: { color: theme.muted, fontSize: 13, fontWeight: "600" },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
    minWidth: 96,
    alignItems: "center",
  },
  toggleOn: { backgroundColor: theme.danger, borderColor: theme.danger },
  toggleText: { color: theme.ink, fontWeight: "700", fontSize: 13 },
  toggleTextOff: { color: "#fff", fontWeight: "800" },
});
