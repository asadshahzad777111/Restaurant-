import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getTenant, clearToken } from "../api";
import type { Tenant, TenantUser } from "../types";
import { theme } from "../theme";
import { OrdersScreen } from "./OrdersScreen";
import { KitchenScreen } from "./KitchenScreen";
import { MenuScreen } from "./MenuScreen";
import { TablesScreen } from "./TablesScreen";
import { POSScreen } from "./POSScreen";
import { DashboardScreen } from "./DashboardScreen";

const Tab = createBottomTabNavigator();

export function HomeScreen({ navigation }: any) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [user, setUser] = useState<TenantUser | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    getTenant()
      .then((d) => {
        setTenant(d.tenant);
        setUser(d.user);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Load error"));
  }, []);

  return (
    <SafeAreaView style={s.shell} edges={["top"]}>
      <View style={s.top}>
        <View>
          <Text style={s.brand}>{tenant?.branding.name || "ORDO Staff"}</Text>
          <Text style={s.code}>
            {user?.roleLabel || "Staff"} · {tenant?.code || ""}
          </Text>
        </View>
        <TouchableOpacity
          style={s.logout}
          onPress={async () => {
            await clearToken();
            navigation.replace("Login");
          }}
        >
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
      {err ? <Text style={s.err}>{err}</Text> : null}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.muted,
          tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.line },
          tabBarLabelStyle: { fontWeight: "700" },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: () => <Text>🏠</Text> }} />
        <Tab.Screen name="POS" component={POSScreen} options={{ tabBarIcon: () => <Text>🛒</Text> }} />
        <Tab.Screen name="Orders" component={OrdersScreen} options={{ tabBarIcon: () => <Text>🧾</Text> }} />
        <Tab.Screen name="Kitchen" component={KitchenScreen} options={{ tabBarIcon: () => <Text>🍳</Text> }} />
        <Tab.Screen name="Menu" component={MenuScreen} options={{ tabBarIcon: () => <Text>📋</Text> }} />
        <Tab.Screen name="Tables" component={TablesScreen} options={{ tabBarIcon: () => <Text>🪑</Text> }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: theme.bg },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  brand: { fontSize: 17, fontWeight: "800", color: theme.ink },
  code: { fontSize: 13, color: theme.muted },
  logout: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.line },
  logoutText: { color: theme.ink, fontWeight: "700" },
  err: { color: theme.danger, padding: 12, fontWeight: "600" },
});
