import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { login } from "../api";
import { theme, radius } from "../theme";

export function LoginScreen({ navigation }: any) {
  const [code, setCode] = useState("DEMO");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setBusy(true);
    setError("");
    try {
      await login(code.trim().toUpperCase(), username, password);
      navigation.replace("Home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.fill}>
        <View style={s.card}>
          <Text style={s.brand}>ORDO</Text>
          <Text style={s.sub}>Staff login</Text>
          <Input label="Restaurant code" value={code} onChange={setCode} autoCapitalize="characters" />
          <Input label="Username" value={username} onChange={setUsername} />
          <Input label="Password" value={password} onChange={setPassword} secure />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <TouchableOpacity style={s.btn} onPress={() => void onLogin()} disabled={busy}>
            <Text style={s.btnText}>{busy ? "Signing in…" : "Sign in"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input({
  label,
  value,
  onChange,
  secure,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  autoCapitalize?: "characters";
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.dark, justifyContent: "center", padding: 20 },
  fill: { flex: 1, justifyContent: "center" },
  card: {
    backgroundColor: theme.darkSurface,
    borderRadius: radius.lg,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  brand: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: 4, textAlign: "center" },
  sub: { color: theme.muted, textAlign: "center", marginBottom: 6 },
  field: { gap: 6 },
  label: { color: "#b6ada3", fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#fff",
    fontSize: 16,
  },
  btn: {
    backgroundColor: theme.accent,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#120b07", fontWeight: "800", fontSize: 16 },
  error: { color: theme.danger, fontWeight: "600" },
});
