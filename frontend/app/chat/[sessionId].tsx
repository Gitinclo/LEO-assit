import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatMessage, leoApi } from "@/src/api/leo";
import { colors, fonts, radius, spacing } from "@/src/theme";

const AI_AVATAR =
  "https://images.unsplash.com/photo-1646038572806-3d5f4252c567?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxjYWxtJTIwZ3JhZGllbnQlMjBzcGhlcmV8ZW58MHx8fHwxNzgyMzQxMTIwfDA&ixlib=rb-4.1.0&q=85";

function TypingDots() {
  return (
    <View style={styles.typingRow} testID="typing-indicator">
      <View style={[styles.dot, styles.dot1]} />
      <View style={[styles.dot, styles.dot2]} />
      <View style={[styles.dot, styles.dot3]} />
    </View>
  );
}

export default function ChatScreen() {
  const { sessionId, initialPrompt } = useLocalSearchParams<{
    sessionId: string;
    initialPrompt?: string;
  }>();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const sentInitial = useRef(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      setInput("");
      setSending(true);
      // Optimistic user message
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        session_id: sessionId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);
      scrollToEnd();
      try {
        const res = await leoApi.sendMessage(sessionId, content);
        setMessages((m) => {
          const withoutOptimistic = m.filter((x) => x.id !== optimistic.id);
          return [...withoutOptimistic, res.user_message, res.assistant_message];
        });
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: `err-${Date.now()}`,
            session_id: sessionId,
            role: "assistant",
            content:
              "I couldn't reach my thoughts just now. Please try that again in a moment.",
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setSending(false);
        scrollToEnd();
      }
    },
    [sessionId, sending, scrollToEnd],
  );

  // Load existing messages once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const msgs = await leoApi.getMessages(sessionId);
        if (active) {
          setMessages(msgs);
        }
      } catch (e) {
        console.warn("getMessages failed", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  // Send the initialPrompt once messages have loaded
  useEffect(() => {
    if (!loading && initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      send(initialPrompt);
    }
  }, [loading, initialPrompt, send]);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}
        testID={`message-${item.role}`}
      >
        {!isUser && (
          <Image source={{ uri: AI_AVATAR }} style={styles.avatar} />
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAi,
          ]}
        >
          <Text
            style={isUser ? styles.bubbleUserText : styles.bubbleAiText}
            selectable
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="chat-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="chat-back-button"
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={{ uri: AI_AVATAR }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerTitle}>LEO</Text>
            <Text style={styles.headerSubtitle}>
              {sending ? "thinking…" : "here when you need"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          testID="chat-history-button"
          onPress={() => router.push("/history")}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <Ionicons name="time-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={sending ? <TypingDots /> : null}
            ListEmptyComponent={
              !sending ? (
                <View style={styles.emptyWrap}>
                  <Image source={{ uri: AI_AVATAR }} style={styles.emptyAvatar} />
                  <Text style={styles.emptyText}>
                    Say anything. I&apos;ll meet you where you are.
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        <View style={styles.inputBar} testID="chat-input-bar">
          <TextInput
            testID="chat-input-field"
            value={input}
            onChangeText={setInput}
            placeholder="Message LEO…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            testID="send-message-button"
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
            style={[
              styles.sendBtn,
              (!input.trim() || sending) && { opacity: 0.5 },
            ]}
            hitSlop={8}
          >
            {sending ? (
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.25),
    flex: 1,
    justifyContent: "center",
  },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: {
    paddingHorizontal: spacing(2),
    paddingTop: spacing(2),
    paddingBottom: spacing(2),
    gap: spacing(2),
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing(8),
    gap: spacing(2),
  },
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, opacity: 0.85 },
  emptyText: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: spacing(3),
  },
  row: { flexDirection: "row", gap: spacing(1.25), alignItems: "flex-end" },
  rowUser: { justifyContent: "flex-end" },
  rowAi: { justifyContent: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 14, marginBottom: 4 },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    borderTopRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderTopLeftRadius: 4,
  },
  bubbleUserText: { color: colors.primaryFg, fontSize: 15, lineHeight: 22 },
  bubbleAiText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  typingRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    marginLeft: spacing(4.5),
    alignSelf: "flex-start",
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted, opacity: 0.6 },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing(1.25),
    paddingHorizontal: spacing(2),
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
