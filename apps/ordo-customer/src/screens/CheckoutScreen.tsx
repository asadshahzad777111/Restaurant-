import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { placeGuestOrder } from "../api";
import type { PublicMenu, MenuItem } from "../types";
import { theme } from "../theme";

export function CheckoutScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { menu, cart, total, code } = route.params as {
    menu: PublicMenu;
    cart: { item: MenuItem; qty: number }[];
    total: number;
    code: string;
  };
  const [service, setService] = useState<"table" | "pickup" | "delivery">("table");
  const [table, setTable] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pay, setPay] = useState("pay_at_counter");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function place() {
    setBusy(true);
    setErr("");
    try {
      const res = await placeGuestOrder({
        tenantCode: code,
        channel: "guest",
        serviceType: service,
        tableNumber: service === "table" ? table : undefined,
        customerName: name || undefined,
        customerPhone: phone || undefined,
        deliveryAddress: service === "delivery" ? address : undefined,
        paymentMethod: service === "table" ? "pay_at_counter" : service === "delivery" ? (pay === "advance" ? "paid_in_advance" : "cod") : pay,
        lines: cart.map((l) => ({
          itemId: l.item.id,
          name: l.item.name,
          qty: l.qty,
          basePrice: l.item.price,
          unitPrice: l.item.price,
        })),
      });
      setDone(true);
      navigation.replace("Track", { code, token: res.order.trackToken });
      // eslint-disable-next-line no-console
      console.log("Order #", res.order.number);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={s.done}>
        <Text style={s.doneBig}>✓</Text>
        <Text style={s.doneTitle}>Order placed</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Checkout</Text>
        <Text style={s.muted}>{menu.branding.name}</Text>

        <Text style={s.label}>Service type</Text>
        <View style={s.modes}>
          {(["table", "pickup", "delivery"] as const).map((m) => (
            <TouchableOpacity key={m} style={[s.mode, service === m && s.modeOn]} onPress={() => setService(m)}>
              <Text style={[s.modeText, service === m && s.modeTextOn]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {service === "table" && (
          <>
            <Text style={s.label}>Table number (or pick below)</Text>
            <TextInput style={s.input} value={table} onChangeText={setTable} placeholder="e.g. 7" />
            <View style={s.tables}>
              {(menu.tables || []).slice(0, 8).map((t) => (
                <TouchableOpacity key={t.id} style={[s.tbl, table === t.label && s.tblOn]} onPress={() => setTable(t.label)}>
                  <Text style={s.tblText}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {service === "delivery" && (
          <>
            <Text style={s.label}>Delivery address</Text>
            <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder="Address" />
          </>
        )}

        <Text style={s.label}>Your name (optional)</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} />
        <Text style={s.label}>Phone (for pickup/delivery)</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        {service === "delivery" && (
          <>
            <Text style={s.label}>Payment</Text>
            <View style={s.modes}>
              {(["cod", "advance"] as const).map((p) => (
                <TouchableOpacity key={p} style={[s.mode, pay === p && s.modeOn]} onPress={() => setPay(p)}>
                  <Text style={[s.modeText, pay === p && s.modeTextOn]}>{p === "cod" ? "Cash on delivery" : "Paid in advance"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={s.total}>
          Total: {menu.shop.currency} {total}
        </Text>
        {err ? <Text style={s.err}>{err}</Text> : null}
        <TouchableOpacity style={s.btn} onPress={() => void place()} disabled={busy}>
          <Text style={s.btnText}>{busy ? "Placing…" : "Place order"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.dark },
  content: { padding: 18, gap: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  muted: { color: theme.muted, fontSize: 14 },
  label: { color: theme.muted, fontWeight: "700", marginTop: 6 },
  modes: { flexDirection: "row", gap: 8 },
  mode: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.darkSurface },
  modeOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  modeText: { color: theme.text, fontWeight: "600" },
  modeTextOn: { color: "#120b07", fontWeight: "800" },
  input: { backgroundColor: theme.darkSurface, borderRadius: 12, padding: 13, color: '#fff' },
  tables: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tbl: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.darkSurface },
  tblOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  tblText: { color: theme.text, fontWeight: "700" },
  total: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 12 },
  err: { color: theme.danger, fontWeight: "600" },
  btn: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  btnText: { color: "#120b07", fontWeight: "800", fontSize: 16 },
  done: { flex: 1, backgroundColor: theme.dark, alignItems: "center", justifyContent: "center", gap: 12 },
  doneBig: { color: theme.success, fontSize: 60, fontWeight: "800" },
  doneTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
});
