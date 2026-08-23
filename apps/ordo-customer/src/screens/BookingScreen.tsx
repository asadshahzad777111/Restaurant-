import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { getMenu, reserveTable, claimTable, releaseTable } from "../api";
import type { PublicMenu } from "../types";
import { theme } from "../theme";

const TOKEN_KEY = "ordo_reservation_v1";

export function BookingScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const code = route.params?.code as string;
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    try {
      setMenu(await getMenu(code));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load error");
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savedToken(tableId: string) {
    try {
      const s = JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) || "null");
      return s?.tenant === code && s?.tableId === tableId ? s.token : null;
    } catch {
      return null;
    }
  }

  async function doReserve(t: { id: string; label: string }, mins: number) {
    try {
      const r = await reserveTable(code, t.id, name || "Guest", mins);
      await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ tenant: code, tableId: t.id, token: r.token }));
      await load();
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Book failed");
    }
  }

  async function doClaim(t: { id: string; label: string }) {
    const tok = await savedToken(t.id);
    if (!tok) return setErr("No reservation on this device");
    try {
      await claimTable(code, t.id, tok);
      await AsyncStorage.removeItem(TOKEN_KEY);
      await load();
      navigation.goBack();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Claim failed");
    }
  }

  async function doCancel(t: { id: string; label: string }) {
    const tok = (await savedToken(t.id)) || undefined;
    try {
      await releaseTable(code, t.id, tok);
      await AsyncStorage.removeItem(TOKEN_KEY);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  const color = (status: string) =>
    status === "reserved"
      ? "#d9930e"
      : status === "occupied"
        ? "#e54838"
        : status === "bill"
          ? "#3b82d0"
          : "#12a66a";

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.head}>
        <Text style={s.title}>Book a table</Text>
        <Text style={s.sub}>{menu?.branding.name} · {code}</Text>
      </View>
      {err ? <Text style={s.err}>{err}</Text> : null}
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name (optional)" placeholderTextColor={theme.muted} />
      {(menu?.tables || []).map((t) => {
        const status = t.status || "empty";
        return (
          <View key={t.id} style={[s.card, { borderColor: color(status) }]}>
            <View style={s.row}>
              <Text style={s.label}>Table {t.label}</Text>
              <Text style={[s.status, { color: color(status) }]}>{status.toUpperCase()}</Text>
            </View>
            {status === "empty" ? (
              <View style={s.actions}>
                {[15, 20, 30].map((m) => (
                  <TouchableOpacity key={m} style={s.bookBtn} onPress={() => void doReserve(t, m)}>
                    <Text style={s.bookText}>Book {m}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            {status === "reserved" ? (
              <View style={s.actions}>
                <TouchableOpacity style={s.claimBtn} onPress={() => void doClaim(t)}>
                  <Text style={s.claimText}>Claim (I'm here)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => void doCancel(t)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {status !== "empty" && status !== "reserved" ? (
              <Text style={s.hint}>This table is {status} — try another</Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.dark },
  content: { padding: 18, gap: 12 },
  head: { marginBottom: 4 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  sub: { color: theme.muted, fontSize: 14, marginTop: 2 },
  err: { color: theme.danger, fontWeight: "600" },
  input: { backgroundColor: theme.darkSurface, borderRadius: 12, padding: 13, color: "#fff" },
  card: { backgroundColor: theme.darkSurface, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: theme.text, fontWeight: "800", fontSize: 16 },
  status: { fontWeight: "800", fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  bookBtn: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
  bookText: { color: "#120b07", fontWeight: "800" },
  claimBtn: { backgroundColor: "#12a66a", borderRadius: 999, paddingVertical: 10, flex: 1, alignItems: "center" },
  claimText: { color: "#fff", fontWeight: "800" },
  cancelBtn: { borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { color: theme.muted, fontWeight: "700" },
  hint: { color: theme.muted, fontSize: 13 },
});
