import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant } from "../api";
import type { Tenant } from "../types";
import { theme, radius } from "../theme";

export function DashboardScreen({ navigation }: any) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await getTenant();
      setTenant(d.tenant);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const orders = tenant?.orders || [];
  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
  const tOrders = orders.filter((o) => isToday(o.createdAt));
  const revenue = tOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const open = tOrders.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const completed = tOrders.filter((o) => o.status === "completed").length;

  const act = [
    { label: "POS", icon: "🛒", tab: "POS" },
    { label: "Kitchen", icon: "🍳", tab: "Kitchen" },
    { label: "Orders", icon: "🧾", tab: "Orders" },
    { label: "Menu", icon: "📋", tab: "Menu" },
    { label: "Tables", icon: "🪑", tab: "Tables" },
  ];
  // @ts-ignore React Navigation nested tab navigation
  const goto = (tab: string) => navigation.navigate(tab);

  const cur = tenant?.shop.currency || "PKR";

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {err ? (
        <View style={s.errBox}>
          <Text style={s.err}>{err}</Text>
          <TouchableOpacity style={s.retry} onPress={() => void load()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginVertical: 32 }} />
      ) : (
        <>
          <View style={s.grid}>
            <View style={[s.stat, s.statMain]}>
              <Text style={s.statLabel}>Today revenue</Text>
              <Text style={s.statValue}>
                {cur} {revenue.toLocaleString()}
              </Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statLabel}>Open</Text>
              <Text style={s.statValue}>{open}</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statLabel}>Completed</Text>
              <Text style={s.statValue}>{completed}</Text>
            </View>
          </View>

          <Text style={s.section}>Quick actions</Text>
          <View style={s.actions}>
            {act.map((a) => (
              <TouchableOpacity key={a.tab} style={s.tile} onPress={() => goto(a.tab)}>
                <Text style={s.tileIcon}>{a.icon}</Text>
                <Text style={s.tileLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 16 },
  errBox: { gap: 10 },
  err: { color: theme.danger, fontWeight: "600" },
  retry: { alignSelf: "flex-start", backgroundColor: theme.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { color: "#fff", fontWeight: "800" },
  grid: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: theme.surface, borderRadius: radius.md, padding: 14, gap: 6, borderWidth: 1, borderColor: theme.line },
  statMain: { borderColor: theme.accent },
  statLabel: { color: theme.muted, fontSize: 13, fontWeight: "600" },
  statValue: { color: theme.ink, fontSize: 24, fontWeight: "800" },
  section: { color: theme.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { backgroundColor: theme.surface, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, padding: 16, alignItems: "center", gap: 6, minWidth: 90, flexGrow: 1 },
  tileIcon: { fontSize: 26 },
  tileLabel: { color: theme.ink, fontWeight: "700", fontSize: 13 },
});
