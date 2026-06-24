import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { leoApi } from "@/src/api/leo";
import { colors, fonts, radius, spacing } from "@/src/theme";

const AI_AVATAR =
  "https://images.unsplash.com/photo-1646038572806-3d5f4252c567?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxjYWxtJTIwZ3JhZGllbnQlMjBzcGhlcmV8ZW58MHx8fHwxNzgyMzQxMTIwfDA&ixlib=rb-4.1.0&q=85";

export default function SettingsScreen() {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const onClearAll = async () => {
    setClearing(true);
    try {
      const sessions = await leoApi.listSessions();
      await Promise.all(sessions.map((s) => leoApi.deleteSession(s.id)));
      setCleared(true);
      setTimeout(() => setCleared(false), 2500);
    } catch (e) {
      console.warn(e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="settings-screen">
      <View style={styles.header}>
        <TouchableOpacity
          testID="settings-back-button"
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.body}>
        <View style={styles.brandCard}>
          <Image source={{ uri: AI_AVATAR }} style={styles.brandAvatar} />
          <Text style={styles.brandName}>LEO</Text>
          <Text style={styles.brandTag}>A quieter kind of AI</Text>
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            LEO is a calm, thoughtful AI companion built to help you think out
            loud. Powered by Claude Sonnet 4.5.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>DATA</Text>
        <TouchableOpacity
          testID="clear-conversations-button"
          onPress={onClearAll}
          disabled={clearing}
          style={styles.dangerRow}
        >
          {clearing ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          )}
          <Text style={styles.dangerText}>
            {cleared ? "Cleared." : "Clear all conversations"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>v1.0 · Built with care</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.textPrimary,
  },
  body: { flex: 1, padding: spacing(3), gap: spacing(2.5) },
  brandCard: {
    alignItems: "center",
    paddingVertical: spacing(3),
    gap: spacing(1),
  },
  brandAvatar: { width: 86, height: 86, borderRadius: 43, marginBottom: spacing(1) },
  brandName: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  brandTag: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textMuted,
    marginTop: spacing(1),
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing(2.5),
  },
  aboutText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dangerText: { fontSize: 15, color: colors.danger, fontWeight: "500" },
  footer: {
    marginTop: "auto",
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
  },
});
