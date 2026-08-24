import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { patchOrder, getTenant } from "../api";
import { useFocusEffect } from "@react-navigation/native";
import { useNewOrders } from "../hooks/useNewOrders";
import { ReceiptView } from "../components/ReceiptView";
import { OrderAlert } from "../components/OrderAlert";
import { EmptyState } from "../components/EmptyState";
import type { Order, Tenant } from "../types";
import { theme, radius } from "../theme";

const NEXT: Record<string, string> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  out_for_delivery: "completed",
};

const ACTIVE = new Set(["placed", "accepted", "preparing", "ready", "out_for_delivery"]);

export function OrdersScreen() {
  const { orders, setOrders, newOrders, dismiss } = useNewOrders(5000);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [filter, setFilter] = useState<"active" | "history">("active");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getTenant()
        .then((d) => setTenant(d.tenant))
        .catch(() => {});
    }, []),
  );

  const currency = tenant?.shop.currency || "PKR";

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

  const filtered = orders.filter((o) =>
    filter === "active" ? ACTIVE.has(o.status) : !ACTIVE.has(o.status),
  );

  return (
    <View style={s.container}>
      {err ? <Text style={s.err}>{err}</Text> : null}
      <View style={s.seg}>
        {(["active", "history"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.segBtn, filter === f && s.segOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.segText, filter === f && s.segTextOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 600);
            }}
            tintColor={theme.accent}
          />
        }
        ListEmptyComponent={
          <EmptyState
            emoji={filter === "active" ? "🧾" : "🗂️"}
            title={filter === "active" ? "No active orders" : "No past orders yet"}
            hint={
              filter === "active"
                ? "New guest and counter orders appear here — place one from the POS tab or ask a guest to order."
                : "Completed and cancelled order history will appear here."
            }
          />
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <TouchableOpacity onPress={() => setSelected(item)}>
              <View style={s.row}>
                <Text style={s.num}>#{item.number}</Text>
                <Text style={s.status}>{item.status}</Text>
                <Text style={s.total}>
                  {currency} {item.total.toLocaleString()}
                </Text>
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
      <ReceiptView
        visible={!!selected}
        order={selected}
        currency={currency}
        tenantCode={tenant?.code}
        printGst={Boolean(tenant?.shop.printGstOnBill)}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  err: { color: theme.danger, padding: 12, fontWeight: "600" },
  seg: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  segBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
  segOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  segText: { color: theme.ink, fontWeight: "700" },
  segTextOn: { color: "#fff", fontWeight: "800" },
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
