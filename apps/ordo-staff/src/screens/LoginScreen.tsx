import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { login } from "../api";
import { theme, radius } from "../theme";

export function LoginScreen({ navigation }: any) {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    if (!code.trim() || !username.trim() || !password) {
      setError("Enter code, username and password");
      return;
    }
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
          <View style={s.field}>
            <Text style={s.label}>Restaurant code</Text>
            <TextInput
              style={s.input}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="DEMO"
              placeholderTextColor="#7a7064"
            />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              placeholder="admin"
              placeholderTextColor="#7a7064"
            />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <View style={s.passRow}>
              <TextInput
                style={[s.input, s.passInput]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                placeholder="••••••••"
                placeholderTextColor="#7a7064"
              />
              <TouchableOpacity style={s.eye} onPress={() => setShowPass((v) => !v)}>
                <Text style={s.eyeText}>{showPass ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <TouchableOpacity style={s.btn} onPress={() => void onLogin()} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#120b07" />
            ) : (
              <Text style={s.btnText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  passRow: { flexDirection: "row", alignItems: "center" },
  passInput: { flex: 1 },
  eye: { padding: 10, position: "absolute", right: 6 },
  eyeText: { fontSize: 18 },
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
