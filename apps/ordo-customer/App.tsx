import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { readCode, saveCode } from "./src/api";
import { MenuScreen } from "./src/screens/MenuScreen";
import { CheckoutScreen } from "./src/screens/CheckoutScreen";
import { TrackScreen } from "./src/screens/TrackScreen";
import { BookingScreen } from "./src/screens/BookingScreen";
import { theme } from "./src/theme";

const Stack = createNativeStackNavigator();

export default function App() {
  const [code, setCode] = useState<string | null>(null);
  const [draft, setDraft] = useState("DEMO");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readCode().then((c) => {
      setCode(c || null);
      setReady(true);
    });
  }, []);

  const open = async () => {
    const c = draft.trim().toUpperCase() || "DEMO";
    await saveCode(c);
    setCode(c);
  };

  if (!ready) return null;

  if (!code) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={s.root}>
          <Text style={s.brand}>ORDO</Text>
          <Text style={s.sub}>Guest ordering</Text>
          <TextInput
            style={s.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Restaurant code (e.g. DEMO)"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity style={s.btn} onPress={() => void open()}>
            <Text style={s.btnText}>Open menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Menu">{() => <MenuScreen code={code} />}</Stack.Screen>
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="Track" component={TrackScreen} />
          <Stack.Screen name="Booking">{() => <BookingScreen route={{ params: { code } }} />}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.dark, justifyContent: "center", padding: 20, gap: 14 },
  brand: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: 4, textAlign: "center" },
  sub: { color: theme.muted, textAlign: "center", marginBottom: 8 },
  input: { backgroundColor: theme.darkSurface, borderRadius: 12, padding: 14, color: '#fff' },
  btn: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 15, alignItems: "center" },
  btnText: { color: '#120b07', fontWeight: "800" },
});
