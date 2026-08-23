import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getTrack } from "../api";
import { theme } from "../theme";

const STEPS = ["placed", "accepted", "preparing", "ready", "out_for_delivery", "completed"];

export function TrackScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { code, token } = route.params as { code: string; token: string };
  const [status, setStatus] = useState("placed");
  const [lines, setLines] = useState<{ name: string; qty: number }[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let dead = false;
    async function tick() {
      const d = await getTrack(code, token);
      if (!d) return;
      setStatus(d.order.status);
      setLines(d.order.lines);
      setTotal(d.order.total);
    }
    void tick();
    const id = setInterval(() => void tick(), 4000);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [code, token]);

  const idx = STEPS.indexOf(status);

  return (
    <View style={s.root}>
      <Text style={s.brand}>Order status</Text>
      <Text style={s.muted}>#{token.slice(4, 8).toUpperCase()}</Text>
      <View style={s.steps}>
        {STEPS.slice(0, 5).map((st, i) => (
          <View key={st} style={s.step}>
            <View style={[s.dot, i <= idx && s.dotOn]} />
            <Text style={s.stepLabel}>{st}</Text>
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Order</Text>
        {lines.map((l, i) => (
          <Text key={i} style={s.line}>
            {l.qty}× {l.name}
          </Text>
        ))}
        <Text style={s.total}>Total: {total}</Text>
      </View>
      <TouchableOpacity style={s.back} onPress={() => navigation.popToTop()}>
        <Text style={s.backText}>← Back to menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.dark, padding: 18, gap: 14 },
  brand: { color: "#fff", fontSize: 24, fontWeight: "800" },
  muted: { color: theme.muted },
  steps: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  step: { alignItems: "center", gap: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: theme.line },
  dotOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  stepLabel: { color: theme.muted, fontSize: 11 },
  card: { backgroundColor: theme.darkSurface, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: theme.line },
  cardTitle: { color: theme.text, fontWeight: "800", marginBottom: 4 },
  line: { color: theme.text, fontSize: 15 },
  total: { color: theme.accentHot, fontWeight: "800", marginTop: 6 },
  back: { padding: 14, borderRadius: 999, borderWidth: 1, borderColor: theme.line, alignItems: "center", marginTop: 8 },
  backText: { color: theme.text, fontWeight: "700" },
});
