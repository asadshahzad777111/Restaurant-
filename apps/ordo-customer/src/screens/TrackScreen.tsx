import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getTrack } from "../api";
import { theme } from "../theme";

const STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "On its way" },
  { key: "completed", label: "Completed" },
] as const;

export function TrackScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { code, token } = route.params as { code: string; token: string };
  const [status, setStatus] = useState<string>("placed");
  const [lines, setLines] = useState<{ name: string; qty: number }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function tick() {
      const d = await getTrack(code, token);
      if (!d) return;
      setStatus(d.order.status);
      setLines(d.order.lines);
      setTotal(d.order.total);
    }
    void tick();
    const id = setInterval(() => void tick(), 4000);
    return () => clearInterval(id);
  }, [code, token]);

  const idx = STEPS.findIndex((st) => st.key === status);

  return (
    <View style={s.root}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => navigation.popToTop()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Order #{token.slice(4, 8).toUpperCase()}</Text>
          <Text style={s.muted}>Live status · updates every few seconds</Text>
        </View>
      </View>

      {/* vertical timeline */}
      <View style={s.timeline}>
        {STEPS.map((st, i) => {
          const done = i < idx;
          const current = i === idx;
          const reached = i <= idx;
          return (
            <View key={st.key} style={s.stepRow}>
              <View style={s.stepTrack}>
                <View style={[s.dot, { borderColor: reached ? theme.accent : theme.line }, done && s.dotDone]}>
                  {done ? <Text style={s.dotCheck}>✓</Text> : current ? <Text style={s.dotCur}>●</Text> : null}
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[s.connector, { backgroundColor: reached && !(i === idx) ? theme.accent : theme.line }]} />
                )}
              </View>
              <Text style={[s.stepLabel, reached && s.stepOn]}>{st.label}</Text>
              {i === idx ? <Text style={s.stepNow}>now</Text> : null}
            </View>
          );
        })}
      </View>
      <View style={s.spacer} />

      <View style={s.card}>
        <Text style={s.cardTitle}>Your order</Text>
        {lines.map((l, i) => (
          <View key={i} style={s.lineRow}>
            <Text style={s.lineName}>{`${l.qty}× ${l.name}`}</Text>
          </View>
        ))}
        <View style={s.rule} />
        <View style={s.lineRow}>
          <Text style={s.lineTotal}>Total</Text>
          <Text style={s.lineTotalVal}>{total}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.dark, padding: 18 },
  head: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: theme.line, alignItems: "center", justifyContent: "center" },
  backBtnText: { color: theme.text, fontSize: 20, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  muted: { color: theme.muted, fontSize: 13, marginTop: 2 },
  timeline: { gap: 0 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 52 },
  stepTrack: { width: 30, alignItems: "center", alignSelf: "stretch", justifyContent: "flex-start", paddingTop: 6 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: theme.darkSurface },
  dotDone: { backgroundColor: theme.accent, borderColor: theme.accent },
  dotCheck: { color: "#120b07", fontWeight: "900", fontSize: 13 },
  dotCur: { color: theme.accent, fontSize: 10 },
  connector: { width: 2, flex: 1, marginVertical: 3, backgroundColor: theme.line },
  stepLabel: { color: theme.muted, fontSize: 15, fontWeight: "700" },
  stepOn: { color: theme.text },
  stepNow: { color: theme.accentHot, fontSize: 12, fontWeight: "800", marginLeft: "auto" },
  spacer: { flex: 1 },
  card: { backgroundColor: theme.darkSurface, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: theme.line },
  cardTitle: { color: theme.text, fontWeight: "800", marginBottom: 2 },
  lineRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  lineName: { color: theme.text, fontSize: 15 },
  rule: { borderBottomWidth: 1, borderColor: theme.line, marginVertical: 4 },
  lineTotal: { color: theme.text, fontWeight: "800" },
  lineTotalVal: { color: theme.accentHot, fontWeight: "800" },
});
