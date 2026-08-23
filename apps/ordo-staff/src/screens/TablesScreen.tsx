import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant, saveTables } from "../api";
import type { Tenant, DiningTable } from "../types";
import { theme, radius } from "../theme";

const COLOR: Record<string, string> = {
  empty: "#e8f5e9",
  occupied: "#fff3e0",
  bill: "#e3f2fd",
};

export function TablesScreen() {
  const { width } = useWindowDimensions();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [err, setErr] = useState("");

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

  async function markEmpty(t: DiningTable) {
    const next = (tenant?.tables || []).map((x) =>
      x.id === t.id ? { ...x, status: "empty", currentOrderId: undefined } : x,
    );
    try {
      const t2 = await saveTables(next);
      setTenant(t2);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  const cols = width > 520 ? 3 : 2;
  const cellW = (width - 16 * 2 - 8 * (cols - 1)) / cols;

  return (
    <View style={s.container}>
      {err ? <Text style={s.err}>{err}</Text> : null}
      <View style={s.grid}>
        {(tenant?.tables || []).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[s.table, { width: cellW }, { backgroundColor: COLOR[t.status] || "#fff" }]}
            onPress={t.status !== "empty" ? () => void markEmpty(t) : undefined}
          >
            <Text style={s.label}>Table {t.label}</Text>
            <Text style={s.seats}>{t.seats} seats</Text>
            <Text style={s.status}>{t.status.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!(tenant?.tables || []).length ? <Text style={s.empty}>No tables yet</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
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
});
