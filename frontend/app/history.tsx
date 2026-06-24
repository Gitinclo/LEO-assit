import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatSession, leoApi } from "@/src/api/leo";
import { colors, fonts, radius, spacing } from "@/src/theme";

function groupByDate(sessions: ChatSession[]) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);

  const groups: { label: string; data: ChatSession[] }[] = [];
  const todayItems: ChatSession[] = [];
  const yItems: ChatSession[] = [];
  const earlier: ChatSession[] = [];

  for (const s of sessions) {
    const d = s.updated_at.slice(0, 10);
    if (d === today) todayItems.push(s);
    else if (d === yesterday) yItems.push(s);
    else earlier.push(s);
  }
  if (todayItems.length) groups.push({ label: "TODAY", data: todayItems });
  if (yItems.length) groups.push({ label: "YESTERDAY", data: yItems });
  if (earlier.length) groups.push({ label: "EARLIER", data: earlier });
  return groups;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await leoApi.listSessions();
      setSessions(list);
    } catch (e) {
      console.warn("listSessions failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onDelete = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await leoApi.deleteSession(id);
    } catch (e) {
      console.warn("delete failed", e);
      load();
    }
  };

  const startNew = async () => {
    try {
      const s = await leoApi.createSession();
      router.push({ pathname: "/chat/[sessionId]", params: { sessionId: s.id } });
    } catch (e) {
      console.warn(e);
    }
  };

  const groups = groupByDate(sessions);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="history-screen">
      <View style={styles.header}>
        <TouchableOpacity
          testID="history-back-button"
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversations</Text>
        <TouchableOpacity
          testID="new-chat-button"
          onPress={startNew}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.label}
          contentContainerStyle={{ padding: spacing(3), gap: spacing(3) }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyHint}>
                Start a new chat and your history will gather here.
              </Text>
              <TouchableOpacity
                testID="empty-new-chat-button"
                onPress={startNew}
                style={styles.emptyBtn}
              >
                <Ionicons name="add" size={20} color={colors.primaryFg} />
                <Text style={styles.emptyBtnText}>Start a conversation</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: group }) => (
            <View style={{ gap: spacing(1.25) }}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={{ gap: spacing(1) }}>
                {group.data.map((s) => (
                  <Pressable
                    key={s.id}
                    testID={`session-row-${s.id}`}
                    onPress={() =>
                      router.push({
                        pathname: "/chat/[sessionId]",
                        params: { sessionId: s.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.row,
                      pressed && { backgroundColor: colors.surfaceElevated },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {s.title || "Untitled"}
                      </Text>
                      {s.preview ? (
                        <Text style={styles.rowPreview} numberOfLines={2}>
                          {s.preview}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      testID={`delete-session-${s.id}`}
                      onPress={() => onDelete(s.id)}
                      hitSlop={10}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        />
      )}
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  groupLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textMuted,
    marginLeft: spacing(0.5),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTitle: { fontSize: 15, color: colors.textPrimary, fontWeight: "500" },
  rowPreview: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: spacing(8),
    gap: spacing(1.5),
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.textPrimary,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing(4),
  },
  emptyBtn: {
    marginTop: spacing(2),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
  },
  emptyBtnText: { color: colors.primaryFg, fontWeight: "500" },
});
