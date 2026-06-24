import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { leoApi } from "@/src/api/leo";
import { colors, fonts, radius, spacing } from "@/src/theme";

const AI_AVATAR =
  "https://images.unsplash.com/photo-1646038572806-3d5f4252c567?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxjYWxtJTIwZ3JhZGllbnQlMjBzcGhlcmV8ZW58MHx8fHwxNzgyMzQxMTIwfDA&ixlib=rb-4.1.0&q=85";

const BG_BOTANICAL =
  "https://images.unsplash.com/photo-1584282617200-32f377e493ef?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwyfHxib3RhbmljYWwlMjBpbGx1c3RyYXRpb24lMjB2aW50YWdlfGVufDB8fHx8MTc4MjM0MTExNnww&ixlib=rb-4.1.0&q=85";

const SUGGESTIONS = [
  "Help me draft a calm reply to a difficult email",
  "Explain a concept like I'm curious, not stupid",
  "Plan a focused morning routine",
  "Brainstorm names for a small side project",
  "Summarize this idea into a single sentence",
];

function greetingForHour() {
  const h = new Date().getHours();
  if (h < 5) return "Late night thoughts?";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  if (h < 21) return "Good evening.";
  return "Working late?";
}

export default function Index() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const startChat = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const session = await leoApi.createSession();
      router.push({
        pathname: "/chat/[sessionId]",
        params: { sessionId: session.id, initialPrompt: text },
      });
    } catch (e) {
      console.warn("createSession failed", e);
    } finally {
      setBusy(false);
      setInput("");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="welcome-screen">
      <Image
        source={{ uri: BG_BOTANICAL }}
        style={styles.bgImage}
        blurRadius={2}
        resizeMode="cover"
      />
      <View style={[styles.bgTint, { pointerEvents: "none" }]} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Image source={{ uri: AI_AVATAR }} style={styles.brandAvatar} />
          <Text style={styles.brandText}>LEO</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            testID="open-history-button"
            onPress={() => router.push("/history")}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="open-settings-button"
            onPress={() => router.push("/settings")}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow} testID="welcome-eyebrow">
            LEO · A QUIETER AI
          </Text>
          <Text style={styles.heading} testID="welcome-heading">
            {greetingForHour()}
          </Text>
          <Text style={styles.subheading}>
            How can I help you think today?
          </Text>

          <Text style={styles.sectionLabel}>TRY A STARTER</Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <Pressable
                key={s}
                testID={`suggestion-chip-${i}`}
                onPress={() => startChat(s)}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && { backgroundColor: colors.surfaceElevated },
                ]}
                disabled={busy}
              >
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.inputBar} testID="welcome-input-bar">
          <TextInput
            testID="welcome-input-field"
            value={input}
            onChangeText={setInput}
            placeholder="Ask LEO anything…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            editable={!busy}
            onSubmitEditing={() => startChat(input)}
            blurOnSubmit
          />
          <TouchableOpacity
            testID="welcome-send-button"
            onPress={() => startChat(input)}
            disabled={!input.trim() || busy}
            style={[
              styles.sendBtn,
              (!input.trim() || busy) && { opacity: 0.5 },
            ]}
            hitSlop={8}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryFg} />
            ) : (
              <Ionicons name="arrow-up" size={22} color={colors.primaryFg} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
  },
  bgTint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    opacity: 0.6,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing(1.25) },
  brandAvatar: { width: 32, height: 32, borderRadius: 16 },
  brandText: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  topActions: { flexDirection: "row", gap: spacing(0.5) },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing(3.5),
    paddingTop: spacing(4),
    paddingBottom: spacing(3),
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2.5,
    color: colors.textMuted,
    marginBottom: spacing(1.5),
  },
  heading: {
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 44,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  subheading: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 34,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing(0.5),
    marginBottom: spacing(5),
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: colors.textMuted,
    marginBottom: spacing(2),
  },
  suggestions: { gap: spacing(1.5) },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(2),
    borderRadius: radius.md,
  },
  chipText: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing(1.25),
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(1.25),
    paddingBottom: spacing(1.25),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 48,
    maxHeight: 140,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
