import { View, Text, StyleSheet, TouchableOpacity, Animated, useEffect as _u } from "react-native";
import { useEffect, useRef } from "react";
import type { Order } from "../types";
import { theme } from "../theme";

/** Persistent "new order" banner — matches the web kitchen alert. Vibrates on native. */
export function OrderAlert({ newOrders, onDismiss }: { newOrders: Order[]; onDismiss: (id: string) => void }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (newOrders.length && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [newOrders.length]);

  if (!newOrders.length) return null;
  const first = newOrders[0];

  return (
    <Animated.View
      style={[s.banner, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }) }]}
    >
      <Text style={s.icon}>🔔</Text>
      <View style={s.text}>
        <Text style={s.title}>New order #{first.number}</Text>
        <Text style={s.sub}>
          {first.serviceType}
          {first.tableNumber ? ` · T${first.tableNumber}` : ""} · {first.lines.length} item
        </Text>
      </View>
      <TouchableOpacity style={s.ok} onPress={() => onDismiss(first.id)}>
        <Text style={s.okText}>Acknowledge</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: theme.accent,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: { fontSize: 22 },
  text: { flex: 1 },
  title: { color: "#120b07", fontWeight: "800", fontSize: 16 },
  sub: { color: "#444", fontWeight: "600", fontSize: 13 },
  ok: { backgroundColor: "#120b07", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  okText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
