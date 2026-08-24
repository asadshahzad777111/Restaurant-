import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant, pauseOrdering, clearToken } from "../api";
import { getPrinter, savePrinter, clearPrinter } from "../printerStorage";
import { enableNotifications } from "../notify";
import { getBondedDevices, pickPrinter, type BtDevice } from "../bluetooth";
import type { Tenant } from "../types";
import { theme, radius } from "../theme";

const ALL_PERMS = ["pos", "orders", "kitchen", "menu", "stock", "settings", "staff", "home"];

export function SettingsScreen({ navigation }: any) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [printerName, setPrinterName] = useState("");
  const [printerMac, setPrinterMac] = useState("");
  const [printerIp, setPrinterIp] = useState("");
  const [printerPort, setPrinterPort] = useState("9100");
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BtDevice[]>([]);
  const loaded = tenant !== null;

  async function scanPrinter() {
    if (scanning) return;
    setScanning(true);
    const bonded = await getBondedDevices();
    setScanning(false);
    setDevices(bonded);
    const pick = pickPrinter(bonded);
    if (pick) {
      setPrinterMac(pick.address);
      if (!printerName.trim()) setPrinterName(pick.name || "Printer");
      setMsg("Found printer — select or save");
    } else {
      setErr("No paired Bluetooth printer found. Pair it in Settings → Bluetooth first.");
    }
  }

  const load = useCallback(async () => {
    try {
      const d = await getTenant();
      setTenant(d.tenant);
      const p = await getPrinter();
      if (p) {
        setPrinterName(p.name);
        setPrinterMac(p.mac);
        setPrinterIp(p.ip || "");
        setPrinterPort(String(p.port || 9100));
      }
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

  const staffCount = tenant?.users?.length || 0;

  function confirmLogout() {
    Alert.alert("Log out", "Sign out of ORDO Staff?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await clearToken();
          navigation.replace("Login");
        },
      },
    ]);
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {err ? <Text style={s.err}>{err}</Text> : null}
      {msg ? <Text style={s.ok}>{msg}</Text> : null}
      {!loaded && !err ? <ActivityIndicator color={theme.accent} style={{ margin: 20 }} /> : null}

      <Text style={s.title}>🏠 Restaurant</Text>
      <View style={s.card}>
        <Text style={s.brand}>{tenant?.branding.name}</Text>
        <Text style={s.muted}>
          Code: {tenant?.code} · Staff: {staffCount}
        </Text>
      </View>

      <Text style={s.title}>⏸ Ordering</Text>
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

      <Text style={s.title}>🖨️ Printer (58mm)</Text>
      <View style={s.card}>
        <Text style={s.muted}>Set your Bluetooth MAC (paired) OR a network IP — the receipt prints automatically to it.</Text>
        <TextInput style={s.input} value={printerName} onChangeText={setPrinterName} placeholder="Printer name" placeholderTextColor={theme.muted} autoCorrect={false} />
        <TextInput style={s.input} value={printerMac} onChangeText={setPrinterMac} placeholder="MAC / address (e.g. A0:BC:11:22:33)" placeholderTextColor={theme.muted} autoCapitalize="characters" autoCorrect={false} />
        <TouchableOpacity style={s.smallGhost} onPress={() => void scanPrinter()}>
          <Text style={s.smallGhostText}>{scanning ? "Scanning…" : "📡 Scan printer"}</Text>
        </TouchableOpacity>
        {devices.length > 0 && (
          <View style={s.devList}>
            {devices.map((d) => (
              <TouchableOpacity key={d.address} style={s.devRow} onPress={() => { setPrinterMac(d.address); setPrinterName(d.name || "Printer"); setDevices([]); }}>
                <Text style={s.devName}>{d.name || "Device"}</Text>
                <Text style={s.devMac}>{d.address}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TextInput style={s.input} value={printerIp} onChangeText={setPrinterIp} placeholder="Network IP (e.g. 192.168.1.50)" placeholderTextColor={theme.muted} autoCapitalize="none" autoCorrect={false} />
        <TextInput style={s.input} value={printerPort} onChangeText={setPrinterPort} placeholder="Port (9100)" placeholderTextColor={theme.muted} keyboardType="number-pad" />
        <View style={s.rowBtns}>
          <TouchableOpacity style={s.smallBtn} onPress={async () => { if (!printerName.trim()) { setErr("Printer name is required"); return; } await savePrinter({ name: printerName, mac: printerMac, ip: printerIp.trim() || undefined, port: Number(printerPort) || 9100 }); setMsg("Printer saved"); setErr(""); }}>
            <Text style={s.smallBtnText}>Save printer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.smallGhost} onPress={async () => { setPrinterName(""); setPrinterMac(""); await clearPrinter(); setMsg("Printer cleared"); }}>
            <Text style={s.smallGhostText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.footInline}>Printing needs a development build with the native printer bridge.</Text>
      </View>

      <Text style={s.title}>🔔 Alerts</Text>
      <View style={s.card}>
        <Text style={s.muted}>New-order push alerts. Tap to allow once — then every new order notifies you.</Text>
        <TouchableOpacity style={s.smallBtn} onPress={async () => {
          const ok = await enableNotifications();
          setMsg(ok ? "Push alerts enabled" : "Alerts not granted");
        }}>
          <Text style={s.smallBtnText}>Enable push alerts</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.title}>👤 Account</Text>
      <TouchableOpacity style={s.logout} onPress={confirmLogout}>
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
  footInline: { color: theme.muted, fontSize: 12, marginTop: 6 },
  logout: { backgroundColor: theme.danger, borderRadius: radius.md, padding: 15, alignItems: "center" },
  logoutText: { color: "#fff", fontWeight: "800" },
  foot: { color: theme.muted, textAlign: "center", fontSize: 12, marginTop: 4 },
  input: { backgroundColor: "#fff", borderRadius: radius.sm, borderWidth: 1, borderColor: theme.line, padding: 11, color: theme.ink, marginTop: 4 },
  rowBtns: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallBtn: { backgroundColor: theme.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.sm },
  smallBtnText: { color: "#fff", fontWeight: "800" },
  smallGhost: { borderWidth: 1, borderColor: theme.line, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.sm },
  smallGhostText: { color: theme.muted, fontWeight: "700" },
  devList: { gap: 6, marginTop: 6 },
  devRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: theme.line, borderRadius: radius.sm, padding: 10 },
  devName: { color: theme.ink, fontWeight: "700", fontSize: 14 },
  devMac: { color: theme.muted, fontSize: 12, fontWeight: "600" },
});
