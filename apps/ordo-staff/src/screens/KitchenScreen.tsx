import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { patchOrder } from "../api";
import { useNewOrders } from "../hooks/useNewOrders";
import { OrderAlert } from "../components/OrderAlert";
import type { Order } from "../types";
import { theme } from "../theme";

const LANES = ["placed", "accepted", "preparing", "ready"] as const;

const NEXT: Record<string, string> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
};

export function KitchenScreen() {
  const { width } = useWindowDimensions();
  const { orders, newOrders, dismiss } = useNewOrders(4000);
  const [err, setErr] = useState("");
  const colW = Math.max(240, width / 2);

  async function advance(o: Order) {
    const next = NEXT[o.status];
    if (!next) return;
    try {
      const updated = await patchOrder(o.id, { status: next as Order["status"] });
      setOrders((prev) => prev.map((x) => (x.id === o.id ? updated : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  const open = orders.filter((o) => !["completed", "cancelled"].includes(o.status));

  return (
    <View style={s.root}>
      <OrderAlert newOrders={newOrders} onDismiss={dismiss} />
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
        {err ? <Text style={s.err}>{err}</Text> : null}
        <View style={s.board}>
        {LANES.map((lane) => {
          const items = open.filter((o) => o.status === lane);
          return (
            <View key={lane} style={[s.lane, { width: colW }]}>
              <Text style={s.laneTitle}>
                {lane} · {items.length}
              </Text>
              {items.map((o) => (
                <View key={o.id} style={s.ticket}>
                  <View style={s.row}>
                    <Text style={s.num}>#{o.number}</Text>
                    <Text style={s.time}>{o.createdAt.slice(11, 16)}</Text>
                  </View>
                  <Text style={s.meta}>
                    {o.serviceType}
                    {o.tableNumber ? ` · T${o.tableNumber}` : ""}
                  </Text>
                  {o.lines.map((l, i) => (
                    <Text key={i} style={s.line}>
                      {l.qty}× {l.name}
                    </Text>
                  ))}
                  {NEXT[o.status] ? (
                    <TouchableOpacity style={s.btn} onPress={() => void advance(o)}>
                      <Text style={s.btnText}>→ {NEXT[o.status]}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {!items.length ? <Text style={s.emptyLane}>—</Text> : null}
            </View>
          );
        })}
      </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  err: { color: theme.danger, padding: 12, fontWeight: "600" },
  board: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  lane: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.line,
  },
  laneTitle: { fontWeight: "800", textTransform: "uppercase", color: theme.muted, letterSpacing: 1 },
  ticket: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.line,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  num: { fontWeight: "800", color: theme.ink, fontSize: 16 },
  time: { color: theme.muted },
  meta: { color: theme.accentDeep, fontWeight: "600", fontSize: 13 },
  line: { color: theme.ink, fontSize: 14 },
  btn: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 9, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "800" },
  emptyLane: { color: theme.muted, textAlign: "center" },
});
