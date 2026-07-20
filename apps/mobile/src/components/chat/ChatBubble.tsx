import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { colors, spacing, borderRadius, typography, shadows } from "../../styles/theme";

interface ChatBubbleProps {
  message: {
    role: string;
    content: string;
    isLoading?: boolean;
  };
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isLoading = message.isLoading && !message.content;

  return (
    <View style={[styles.container, isUser && styles.userContainer]}>
      {/* Avatar */}
      {isAssistant && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
          </View>
        </View>
      )}

      {/* Bubble */}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {isLoading ? (
          <View style={styles.typingContainer}>
            <TypingDots />
          </View>
        ) : isAssistant ? (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        ) : (
          <Text style={[styles.text, isUser && styles.userText]}>
            {message.content}
          </Text>
        )}

        {/* Timestamp / actions for assistant */}
        {isAssistant && !isLoading && message.content && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="refresh" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* User avatar */}
      {isUser && (
        <View style={[styles.avatarContainer, styles.userAvatarContainer]}>
          <View style={[styles.avatar, styles.userAvatar]}>
            <Ionicons name="person" size={14} color={colors.text} />
          </View>
        </View>
      )}
    </View>
  );
}

function TypingDots() {
  return (
    <View style={styles.typingDots}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, { opacity: 0.4 + i * 0.3 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: spacing.md,
    alignItems: "flex-end",
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  userAvatarContainer: {
    marginRight: 0,
    marginLeft: spacing.sm,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    backgroundColor: colors.surfaceLighter,
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: borderRadius.sm,
    borderWidth: 0.5,
    borderColor: colors.userBubbleBorder,
    ...shadows.sm,
  },
  assistantBubble: {
    backgroundColor: colors.assistantBubble,
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 0.5,
    borderColor: colors.assistantBubbleBorder,
    ...shadows.sm,
  },
  text: {
    ...typography.body,
    color: colors.text,
  },
  userText: {
    color: "#fff",
  },
  typingContainer: {
    paddingVertical: spacing.xs,
  },
  typingDots: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: colors.divider,
  },
  actionBtn: {
    padding: 4,
  },
});

const markdownStyles = {
  body: { ...typography.body, color: colors.text },
  heading1: { fontSize: 20, fontWeight: "700" as const, color: colors.text, marginBottom: 4, marginTop: 8 },
  heading2: { fontSize: 18, fontWeight: "700" as const, color: colors.text, marginBottom: 4, marginTop: 6 },
  heading3: { fontSize: 16, fontWeight: "600" as const, color: colors.text, marginBottom: 4, marginTop: 4 },
  paragraph: { marginBottom: 6 },
  link: { color: colors.primary, textDecorationLine: "underline" as const },
  code_inline: {
    backgroundColor: "#f0f0f0", color: "#e53935", paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 4, fontFamily: "monospace", fontSize: 13,
  },
  code_block: {
    backgroundColor: "#f5f5f5", color: colors.text, padding: spacing.md,
    borderRadius: borderRadius.md, fontFamily: "monospace", fontSize: 13,
    marginVertical: 6,
  },
  fence: {
    backgroundColor: "#f5f5f5", color: colors.text, padding: spacing.md,
    borderRadius: borderRadius.md, fontFamily: "monospace", fontSize: 13,
    marginVertical: 6,
  },
  blockquote: {
    backgroundColor: "#f9f9f9", borderLeftWidth: 3, borderLeftColor: colors.primary,
    paddingLeft: spacing.md, paddingVertical: spacing.xs, marginVertical: 6,
  },
  list_item: { marginBottom: 2 },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  hr: { backgroundColor: colors.divider, height: 1, marginVertical: 8 },
  table: { borderWidth: 1, borderColor: colors.divider, marginVertical: 6 },
  thead: { backgroundColor: "#f5f5f5" },
  tr: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  th: { padding: 6, fontWeight: "600" as const },
  td: { padding: 6 },
};

export { markdownStyles };
