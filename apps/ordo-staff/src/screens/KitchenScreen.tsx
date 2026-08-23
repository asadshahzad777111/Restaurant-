import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { patchOrder } from "../api";
import { useNewOrders } from "../hooks/useNewOrders";
import { OrderAlert } from "../components/OrderAlert";
import type { Order } from "../types";
import { theme } from "../theme";

const LANES = ["placed", "accepted", "preparing", "ready", "out_for_delivery"] as const;
const LANE_COLOR: Record<string, string> = {
  placed: "#e54838",
  accepted: "#ff8500",
  preparing: "#d9930e",
  ready: "#12a66a",
  out_for_delivery: "#3b82d0",
};

const NEXT: Record<string, string> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  out_for_delivery: "completed",
};

export function KitchenScreen() {
  const { width } = useWindowDimensions();
  const { orders, setOrders, newOrders, dismiss } = useNewOrders(4000);
  const [err, setErr] = useState("");
  const colW = Math.max(240, width / 2);
  const loaded = orders.length > 0 || err !== "";
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [, forceTick] = useState(0);

  useEffect(() => {
    const anyActive = Object.values(countdowns).some((e) => e - Date.now() > 0);
    if (!anyActive) return;
    const id = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [countdowns]);

  function setTimer(id: string) {
    setCountdowns((prev) => ({ ...prev, [id]: Date.now() + 15 * 60000 }));
  }
  function clearTimer(id: string) {
    setCountdowns((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function remain(endsAt?: number) {
    if (!endsAt) return "";
    const sec = Math.floor((endsAt - Date.now()) / 1000);
    if (sec <= 0) return "READY!";
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m}:${r < 10 ? "0" : ""}${r}`;
  }

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
        {!loaded ? <Text style={s.loading}>Loading tickets…</Text> : null}
        <View style={s.board}>
        {LANES.map((lane) => {
          const items = open.filter((o) => o.status === lane);
          return (
            <View key={lane} style={[s.lane, { width: colW }]}>
              <View style={s.laneHead}>
                <View style={[s.laneDot, { backgroundColor: LANE_COLOR[lane] || theme.accent }]} />
                <Text style={s.laneTitle}>{lane}</Text>
                <Text style={s.laneCount}>{items.length}</Text>
              </View>
              {items.map((o) => {
                const cd = countdowns[o.id];
                const expired = cd !== undefined && cd - Date.now() <= 0;
                return (
                <View key={o.id} style={s.ticket}>
                  <View style={s.row}>
                    <Text style={s.num}>#{o.number}</Text>
                    <Text style={s.time}>{o.createdAt.slice(11, 16)}</Text>
                  </View>
                  {cd !== undefined && (
                    <Text style={[s.timerBadge, expired && s.timerBadgeExpired]}>
                      ⏱ {expired ? "READY — serve it" : remain(cd)}
                    </Text>
                  )}
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
                      <Text style={s.btnText}>{o.status === "ready" || o.status === "out_for_delivery" ? "✓ Done" : `→ ${NEXT[o.status]}`}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={s.timerBtn} onPress={() => (cd ? clearTimer(o.id) : setTimer(o.id))}>
                    <Text style={s.timerBtnText}>{cd ? "Clear timer" : "⏱ Timer"}</Text>
                  </TouchableOpacity>
                </View>
                );
              })}
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
  loading: { color: theme.muted, textAlign: "center", padding: 16 },
  board: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  lane: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.line,
  },
  laneTitle: { fontWeight: "800", textTransform: "uppercase", color: theme.ink, letterSpacing: 1 },
  laneHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  laneDot: { width: 10, height: 10, borderRadius: 5 },
  laneCount: { marginLeft: "auto", fontWeight: "800", color: theme.muted, fontSize: 13 },
  ticket: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.line,
    shadowColor: "#120b07",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  num: { fontWeight: "800", color: theme.accentDeep, fontSize: 16 },
  time: { color: theme.muted },
  meta: { color: theme.accentDeep, fontWeight: "600", fontSize: 13 },
  line: { color: theme.ink, fontSize: 14 },
  btn: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 9, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "800" },
  timerBadge: { alignSelf: "flex-start", fontSize: 12, fontWeight: "800", color: "#fff", backgroundColor: "#7a5a12", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 2 },
  timerBadgeExpired: { backgroundColor: theme.danger },
  timerBtn: { borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingVertical: 7, alignItems: "center", marginTop: 4 },
  timerBtnText: { color: theme.muted, fontWeight: "700", fontSize: 12 },
  emptyLane: { color: theme.muted, textAlign: "center" },
});
