import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { useState } from "react";
import { printOrder } from "../print";
import type { Order } from "../types";
import { theme } from "../theme";

/** 58mm-style receipt preview (screen only). Native ESC/POS print adds the BT bridge. */
export function ReceiptView({
  visible,
  order,
  currency,
  onClose,
}: {
  visible: boolean;
  order: Order | null;
  currency: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"" | "ok" | "no">("");

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <TouchableOpacity style={s.close} onPress={onClose}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
          <ScrollView style={s.slipWrap}>
            {order && (
              <View style={s.slip}>
                <Text style={s.name}>{order.serviceType.toUpperCase()}</Text>
                <Text style={s.meta}>
                  #{order.number} · {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <View style={s.rule} />
                {order.lines.map((l, i) => (
                  <View key={i} style={s.lineGroup}>
                    <View style={s.lineRow}>
                      <Text style={s.lineL}>{`${l.qty}× ${l.name}`}</Text>
                      <Text style={s.lineR}>{l.unitPrice * l.qty}</Text>
                    </View>
                    {(l.modifiers || []).map((m) => (
                      <Text key={m.optionId} style={s.mod}>
                        + {m.optionName}
                        {m.priceDelta ? ` (${m.priceDelta > 0 ? "+" : ""}${m.priceDelta})` : ""}
                      </Text>
                    ))}
                  </View>
                ))}
                <View style={s.rule} />
                <View style={s.lineRow}>
                  <Text style={s.totalL}>Subtotal</Text>
                  <Text style={s.lineR}>{order.fees?.subtotal ?? order.subtotal}</Text>
                </View>
                {order.fees?.serviceCharge ? (
                  <View style={s.lineRow}>
                    <Text style={s.totalL}>Service</Text>
                    <Text style={s.lineR}>{order.fees.serviceCharge}</Text>
                  </View>
                ) : null}
                {order.fees?.tax ? (
                  <View style={s.lineRow}>
                    <Text style={s.totalL}>Tax</Text>
                    <Text style={s.lineR}>{order.fees.tax}</Text>
                  </View>
                ) : null}
                {order.discount ? (
                  <View style={s.lineRow}>
                    <Text style={s.totalL}>Discount</Text>
                    <Text style={s.lineR}>-{order.discount}</Text>
                  </View>
                ) : null}
                <View style={s.lineRow}>
                  <Text style={s.totalL}>TOTAL</Text>
                  <Text style={s.totalR}>
                    {currency} {order.total}
                  </Text>
                </View>
                <Text style={s.foot}>Thank you · Visit again</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            style={s.printBtn}
            onPress={async () => {
              const ok = await printOrder(order!, currency);
              setStatus(ok ? "ok" : "no");
            }}
          >
            <Text style={s.printText}>🗨 Print</Text>
          </TouchableOpacity>
          {status === "ok" ? <Text style={s.okNote}>Sent to printer</Text> : null}
          {status === "no" ? <Text style={s.noNote}>Needs a development build</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", padding: 16 },
  sheet: { backgroundColor: theme.bg, borderRadius: 18, maxHeight: "80%", padding: 16, gap: 12 },
  close: { alignSelf: "flex-end", padding: 6 },
  closeText: { color: theme.muted, fontSize: 20 },
  slipWrap: { backgroundColor: "#fff", borderRadius: 8, padding: 12, alignSelf: "center", width: "70%" },
  slip: { gap: 2 },
  name: { color: "#111", fontWeight: "800", textAlign: "center", letterSpacing: 2, fontSize: 14 },
  meta: { color: "#555", textAlign: "center", fontSize: 11 },
  rule: { borderBottomWidth: 1, borderStyle: "dashed", borderColor: "#999", marginVertical: 6 },
  lineRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  lineL: { color: "#111", fontSize: 12 },
  lineR: { color: "#111", fontWeight: "700", fontSize: 12 },
  lineGroup: { gap: 1 },
  mod: { color: "#555", fontSize: 11, paddingLeft: 8 },
  totalL: { color: "#111", fontWeight: "800", fontSize: 14 },
  totalR: { color: "#c45c26", fontWeight: "800", fontSize: 14 },
  foot: { color: "#555", textAlign: "center", fontSize: 11, marginTop: 8 },
  printBtn: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  printText: { color: "#fff", fontWeight: "800" },
  okNote: { color: theme.success, fontWeight: "700", textAlign: "center" },
  noNote: { color: theme.muted, fontWeight: "600", textAlign: "center" },
});
