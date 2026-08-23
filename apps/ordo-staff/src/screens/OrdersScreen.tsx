import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { patchOrder } from "../api";
import { useNewOrders } from "../hooks/useNewOrders";
import { ReceiptView } from "../components/ReceiptView";
import { OrderAlert } from "../components/OrderAlert";
import { EmptyState } from "../components/EmptyState";
import type { Order } from "../types";
import { theme, radius } from "../theme";

const NEXT: Record<string, string> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  out_for_delivery: "completed",
};

export function OrdersScreen() {
  const { orders, setOrders, newOrders, dismiss } = useNewOrders(5000);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

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

  return (
    <View style={s.container}>
      {err ? <Text style={s.err}>{err}</Text> : null}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<EmptyState emoji="🧾" title="No orders yet" hint="New guest and counter orders appear here — place one from the POS tab or ask a guest to order." />}
        renderItem={({ item }) => (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setSelected(item)}>
              <View style={s.row}>
                <Text style={s.num}>#{item.number}</Text>
                <Text style={s.status}>{item.status}</Text>
                <Text style={s.total}>{item.total}</Text>
              </View>
              <Text style={s.meta}>
                {item.channel}/{item.serviceType}
                {item.tableNumber ? ` · T${item.tableNumber}` : ""}
                {item.customerName ? ` · ${item.customerName}` : ""}
              </Text>
            </TouchableOpacity>
            <View style={s.lines}>
              {item.lines.map((l, i) => (
                <Text key={i} style={s.line}>
                  {l.qty}× {l.name}
                </Text>
              ))}
            </View>
            {NEXT[item.status] ? (
              <TouchableOpacity style={s.btn} onPress={() => void advance(item)}>
                <Text style={s.btnText}>→ {NEXT[item.status]}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
      <OrderAlert newOrders={newOrders} onDismiss={dismiss} />
      <ReceiptView visible={!!selected} order={selected} currency="PKR" onClose={() => setSelected(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  err: { color: theme.danger, padding: 12, fontWeight: "600" },
  empty: { color: theme.muted, textAlign: "center", padding: 24 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.line,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  num: { fontSize: 17, fontWeight: "800", color: theme.ink },
  status: { color: theme.accentDeep, fontWeight: "700", textTransform: "uppercase" },
  total: { fontSize: 15, fontWeight: "800", color: theme.ink },
  meta: { color: theme.muted, fontSize: 13 },
  lines: { gap: 2 },
  line: { color: theme.ink, fontSize: 14 },
  btn: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "800" },
});
