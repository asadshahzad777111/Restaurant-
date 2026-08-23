import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

/** Friendly empty state with an icon, title and hint. */
export function EmptyState({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <View style={s.wrap}>
      <Text style={s.emoji}>{emoji}</Text>
      <Text style={s.title}>{title}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 24, gap: 8 },
  emoji: { fontSize: 44, opacity: 0.85 },
  title: { color: theme.ink, fontWeight: "800", fontSize: 17 },
  hint: { color: theme.muted, fontSize: 13, textAlign: "center", lineHeight: 19 },
});
