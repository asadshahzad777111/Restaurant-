import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant, pauseOrdering, clearToken } from "../api";
import type { Tenant } from "../types";
import { theme, radius } from "../theme";

const ALL_PERMS = ["pos", "orders", "kitchen", "menu", "stock", "settings", "staff", "home"];

export function SettingsScreen({ navigation }: any) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
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

  async function togglePause() {
    setBusy(true);
    try {
      const t = await pauseOrdering(!tenant?.orderingPaused);
      setTenant(t);
      setMsg(t.orderingPaused ? "Ordering paused" : "Ordering resumed");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const allowed = tenant?.users?.map((u) => u.permissions?.length) ?? [];
  const staffCount = tenant?.users?.length || 0;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {err ? <Text style={s.err}>{err}</Text> : null}
      {msg ? <Text style={s.ok}>{msg}</Text> : null}

      <Text style={s.title}>Kitchen</Text>
      <View style={s.card}>
        <Text style={s.brand}>{tenant?.branding.name}</Text>
        <Text style={s.muted}>
          Code: {tenant?.code} · Staff: {staffCount}
        </Text>
      </View>

      <Text style={s.title}>Ordering</Text>
      <TouchableOpacity
        style={[s.card, tenant?.orderingPaused && s.pauseCard]}
        onPress={() => void togglePause()}
        disabled={busy}
      >
        <Text style={s.cardTitle}>{tenant?.orderingPaused ? "▶ Resume ordering" : "⏸ Pause ordering"}</Text>
        <Text style={s.muted}>
          {tenant?.orderingPaused
            ? "Guests can browse but cannot place orders. Staff tools stay open."
            : "Guests can order right now."}
        </Text>
      </TouchableOpacity>

      <Text style={s.title}>Account</Text>
      <TouchableOpacity
        style={s.logout}
        onPress={async () => {
          await clearToken();
          navigation.replace("Login");
        }}
      >
        <Text style={s.logoutText}>Log out</Text>
      </TouchableOpacity>
      <Text style={s.foot}>ORDO Staff v1.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 12 },
  err: { color: theme.danger, fontWeight: "600" },
  ok: { color: theme.success, fontWeight: "700" },
  title: { color: theme.muted, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, fontSize: 13, marginTop: 6 },
  card: { backgroundColor: theme.surface, borderRadius: radius.md, padding: 16, gap: 6, borderWidth: 1, borderColor: theme.line },
  pauseCard: { borderColor: theme.warning },
  brand: { color: theme.ink, fontSize: 18, fontWeight: "800" },
  cardTitle: { color: theme.ink, fontSize: 16, fontWeight: "800" },
  muted: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  logout: { backgroundColor: theme.danger, borderRadius: radius.md, padding: 15, alignItems: "center" },
  logoutText: { color: "#fff", fontWeight: "800" },
  foot: { color: theme.muted, textAlign: "center", fontSize: 12, marginTop: 4 },
});
