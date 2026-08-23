import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant, saveTables } from "../api";
import { EmptyState } from "../components/EmptyState";
import type { Tenant, DiningTable } from "../types";
import { theme, radius } from "../theme";

const COLOR: Record<string, string> = {
  empty: "#e8f5e9",
  occupied: theme.accentHot,
  bill: "#e3f2fd",
};

export function TablesScreen() {
  const { width } = useWindowDimensions();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const loaded = tenant !== null;

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

  function markEmpty(t: DiningTable) {
    if (busy) return;
    Alert.alert("Clear this table?", `Mark Table ${t.label} as empty and close its open order?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Clear table",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const next = (tenant?.tables || []).map((x) =>
            x.id === t.id ? { ...x, status: "empty", currentOrderId: undefined } : x,
          );
          try {
            const t2 = await saveTables(next);
            setTenant(t2);
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Update failed");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  const cols = width > 520 ? 3 : 2;
  const cellW = (width - 16 * 2 - 8 * (cols - 1)) / cols;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {err ? <Text style={s.err}>{err}</Text> : null}
      {!loaded && !err ? <ActivityIndicator color={theme.accent} style={{ margin: 24 }} /> : null}
      <View style={s.grid}>
        {(tenant?.tables || []).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[
              s.table,
              { width: cellW },
              { backgroundColor: t.status === "empty" ? COLOR.empty : t.status === "bill" ? COLOR.bill : COLOR.occupied },
            ]}
            onPress={t.status !== "empty" ? () => void markEmpty(t) : undefined}
            activeOpacity={t.status !== "empty" ? 0.7 : 1}
            disabled={busy}
          >
            <Text style={s.label}>Table {t.label}</Text>
            <Text style={s.seats}>{t.seats} seats</Text>
            <Text style={[s.status, t.status !== "empty" && s.statusOccupied]}>
              {t.status.toUpperCase()}
            </Text>
            {t.status !== "empty" ? <Text style={s.hint}>Tap to clear</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
      {loaded && !(tenant?.tables || []).length ? (
        <EmptyState emoji="🪑" title="No tables yet" hint="Add tables from the web Settings → Tables to map your floor." />
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16 },
  err: { color: theme.danger, padding: 12, fontWeight: "600" },
  empty: { color: theme.muted, textAlign: "center", padding: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  table: {
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.line,
    gap: 3,
  },
  label: { fontSize: 15, fontWeight: "800", color: theme.ink },
  seats: { fontSize: 12, color: theme.muted },
  status: { fontWeight: "700", color: theme.ink, marginTop: 4 },
  statusOccupied: { color: "#7a4100" },
  hint: { fontSize: 11, color: theme.muted, fontWeight: "600" },
});
