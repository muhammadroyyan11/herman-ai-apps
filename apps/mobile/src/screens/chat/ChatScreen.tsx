import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Platform, ActivityIndicator, Animated, Dimensions, Image,
  Modal, Keyboard, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, borderRadius, typography, shadows } from "../../styles/theme";
import { useTheme } from "../../styles/ThemeProvider";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { api } from "../../services/api";
import { ChatBubble } from "../../components/chat/ChatBubble";

const { width } = Dimensions.get("window");

interface ConversationSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
  message_count: number;
  is_pinned: boolean;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

export function ChatScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [inputFocused, setInputFocused] = useState(false);
  const [showWsDropdown, setShowWsDropdown] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { messages, isStreaming, addMessage, setIsStreaming, currentConversationId, currentWorkspaceId, setCurrentWorkspaceId, clearChat } = useChatStore();
  const [streamContent, setStreamContent] = useState("");
  const { user } = useAuthStore();
  const { workspaces } = useWorkspaceStore();

  const [doneNotif, setDoneNotif] = useState("");

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const renderChatItem = useCallback(({ item }: { item: any }) => {
    const isStreamingMsg = isStreaming && streamContent && item === messages[messages.length - 1];
    return <ChatBubble message={{ ...item, content: isStreamingMsg ? streamContent : item.content }} />;
  }, [messages, isStreaming, streamContent]);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const fetchConvos = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const { data } = await api.getConversations(currentWorkspaceId || undefined);
      setConvos(data.conversations || []);
    } catch {} finally {
      setLoadingConvos(false);
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    fetchConvos();
  }, [fetchConvos]);

  const handleSelectWorkspace = (wsId: string | null) => {
    setCurrentWorkspaceId(wsId);
    clearChat();
  };

  const handleSelectConversation = (convId: string) => {
    setCurrentWorkspaceId(convos.find(c => c.id === convId)?.workspace_id || currentWorkspaceId);
    useChatStore.getState().setCurrentConversation(convId);
    loadConversationMessages(convId);
  };

  const loadConversationMessages = async (convId: string) => {
    try {
      const { data } = await api.getConversation(convId);
      useChatStore.getState().setMessages(data.messages || []);
    } catch {}
  };

  const handleNewChat = () => {
    clearChat();
    setShowMenu(false);
  };

  const handleDeleteConversation = async () => {
    if (!currentConversationId) return;
    setShowMenu(false);
    Alert.alert("Delete Conversation", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await api.deleteConversation(currentConversationId);
            clearChat();
            fetchConvos();
          } catch {}
        },
      },
    ]);
  };

  const handleBack = () => {
    clearChat();
    fetchConvos();
  };

  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "text/csv", "application/json",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
               "image/png", "image/jpeg"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setUploading(true);

      await api.uploadDocument({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      });

      setUploading(false);
      setDoneNotif("✅ File uploaded to knowledge base");
      setTimeout(() => setDoneNotif(""), 3000);
    } catch (err: any) {
      setUploading(false);
      Alert.alert("Upload Failed", err?.response?.data?.detail || err?.message || "Could not upload file");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const day = 86400000;
    if (diff < day) return "Today";
    if (diff < 2 * day) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const groupedConvos: { label: string; convos: ConversationSummary[] }[] = [];
  if (convos.length > 0) {
    const today: ConversationSummary[] = [];
    const yesterday: ConversationSummary[] = [];
    const older: ConversationSummary[] = [];
    convos.forEach((c) => {
      const label = formatDate(c.updated_at);
      if (label === "Today") today.push(c);
      else if (label === "Yesterday") yesterday.push(c);
      else older.push(c);
    });
    if (today.length) groupedConvos.push({ label: "Today", convos: today });
    if (yesterday.length) groupedConvos.push({ label: "Yesterday", convos: yesterday });
    if (older.length) groupedConvos.push({ label: "Older", convos: older });
  }

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    addMessage(userMessage);
    const text = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamContent("");

    const assistantId = (Date.now() + 1).toString();
    useChatStore.getState().addMessage({
      id: assistantId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    });

    let convId = currentConversationId;
    let done = false;
    let fullContent = "";

    await new Promise<void>((resolve) => {
      api.sendMessageStream(
        {
          conversation_id: convId || undefined,
          content: text,
          workspace_id: currentWorkspaceId || undefined,
        },
        (chunk) => {
          fullContent += chunk;
          setStreamContent(fullContent);
        },
        (tool) => {
          fullContent += `\n\n⚙️ running \`${tool}\`...\n\n`;
          setStreamContent(fullContent);
        },
        (newConvId, finalContent) => {
          if (!done) {
            done = true;
            if (newConvId) {
              useChatStore.getState().setCurrentConversation(newConvId);
            }
            useChatStore.getState().updateLastMessage(finalContent || fullContent);
            resolve();
          }
        },
        (err) => {
          if (!done) {
            done = true;
            useChatStore.getState().updateLastMessage(`⚠️ Error: ${err}`);
            resolve();
          }
        },
      );
    });

    setIsStreaming(false);
    setStreamContent("");
    setDoneNotif("✅ Done");
    setTimeout(() => setDoneNotif(""), 2000);
    fetchConvos();
  };

  const isEmpty = messages.length === 0;

  const handleScroll = (e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const contentHeight = e.nativeEvent.contentSize.height;
    const frameHeight = e.nativeEvent.layoutMeasurement.height;
    const isNearBottom = offsetY + frameHeight >= contentHeight - 100;
    setShowScrollBtn(!isNearBottom);
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })(e);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollBtn(false);
  };

  const renderEmpty = () => {
    const suggestions = [
      { icon: "code-slash", label: "Write code" },
      { icon: "bulb", label: "Brainstorm" },
      { icon: "language", label: "Translate" },
      { icon: "search", label: "Research" },
    ];

    if (convos.length > 0) {
      return (
        <View style={styles.convoListContainer}>
          <View style={styles.convoHeader}>
            <Text style={styles.convoHeaderTitle}>
              {workspaces.find(w => w.id === currentWorkspaceId)?.name || "All Conversations"}
            </Text>
            <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
              <Ionicons name="add-circle" size={18} color={colors.primary} />
              <Text style={styles.newChatBtnText}>New</Text>
            </TouchableOpacity>
          </View>
          {loadingConvos ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              groupedConvos.map((group) => (
                <View key={group.label} style={styles.convoGroup}>
                  <Text style={styles.convoGroupLabel}>{group.label}</Text>
                  {group.convos.map((item) => {
                    const ws = workspaces.find((w) => w.id === item.workspace_id);
                    const wsColor = ws?.color || colors.primary;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.convoCard}
                        onPress={() => handleSelectConversation(item.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.convoIcon, { backgroundColor: wsColor + "15" }]}>
                          <Ionicons name={(ws?.icon || "chatbubble") as any} size={16} color={wsColor} />
                        </View>
                        <View style={styles.convoInfo}>
                          <Text style={styles.convoTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.convoMeta}>
                            {ws && !currentWorkspaceId ? `${ws.name} · ` : ""}
                            {item.message_count} messages · {formatDate(item.updated_at)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <Image source={require("../../../assets/herman_ai.png")} style={styles.emptyImage} />
          <Text style={styles.emptyTitle}>How can I help?</Text>
          <Text style={styles.emptySubtitle}>
            Your intelligent AI operating system
          </Text>

          <View style={styles.suggestionsGrid}>
            {suggestions.map((item) => {
              const sc = item.label === "Write code" ? colors.success
                       : item.label === "Brainstorm" ? colors.warning
                       : item.label === "Translate" ? colors.accent
                       : colors.primary;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={styles.suggestionCard}
                  onPress={() => setInput(item.label.toLowerCase())}
                  activeOpacity={0.7}
                >
                  <View style={[styles.suggestionIcon, { backgroundColor: sc + "15" }]}>
                    <Ionicons name={item.icon as any} size={22} color={sc} />
                  </View>
                  <Text style={styles.suggestionLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primaryGlow, "transparent"]}
        style={styles.headerGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={{ flex: 1, paddingBottom: kbHeight }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {!isEmpty ? (
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
              <View style={styles.headerOrb}>
                <Image source={require("../../../assets/herman_ai.png")} style={styles.headerLogo} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Herman AI</Text>
                <TouchableOpacity style={styles.wsBadge} onPress={() => setShowWsDropdown(true)}>
                  <Text style={styles.wsBadgeText}>
                    {workspaces.find(w => w.id === currentWorkspaceId)?.name || "All Chats"}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowMenu(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          {isEmpty ? (
            renderEmpty()
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={100}
            />
          )}

          {!isEmpty && showScrollBtn && (
            <TouchableOpacity style={styles.scrollBtn} onPress={scrollToBottom} activeOpacity={0.8}>
              <Ionicons name="chevron-down" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Done Notification */}
          {doneNotif ? (
            <View style={styles.doneNotif}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.doneNotifText}>{doneNotif}</Text>
            </View>
          ) : null}

          {/* Input Bar */}
          <View style={[styles.inputWrapper, inputFocused && styles.inputWrapperFocused, kbHeight > 0 && { marginBottom: 0 }]}>
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.attachBtn} onPress={handleAttach} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="add" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Message Herman AI..."
                placeholderTextColor={colors.textTertiary}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={4000}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
              <TouchableOpacity style={styles.micBtn}>
                <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!input.trim() || isStreaming}
              >
                {isStreaming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={input.trim() ? "#fff" : colors.textTertiary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animation="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleNewChat}>
              <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.menuLabel}>New Chat</Text>
            </TouchableOpacity>
            {currentConversationId ? (
              <>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleDeleteConversation}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.menuLabel, { color: colors.error }]}>Delete Conversation</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showWsDropdown} transparent animation="fade">
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowWsDropdown(false)}>
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={[styles.dropdownItem, !currentWorkspaceId && styles.dropdownItemActive]}
              onPress={() => { handleSelectWorkspace(null); setShowWsDropdown(false); }}
            >
              <Ionicons name="chatbubbles" size={18} color={!currentWorkspaceId ? colors.primary : colors.textSecondary} />
              <Text style={[styles.dropdownLabel, !currentWorkspaceId && styles.dropdownLabelActive]}>All Chats</Text>
              {!currentWorkspaceId && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
            {workspaces.map((ws) => {
              const active = ws.id === currentWorkspaceId;
              const wsColor = ws.color || colors.primary;
              return (
                <TouchableOpacity
                  key={ws.id}
                  style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                  onPress={() => { handleSelectWorkspace(ws.id); setShowWsDropdown(false); }}
                >
                  <View style={[styles.dropdownIcon, { backgroundColor: wsColor + "20" }]}>
                    <Ionicons name={(ws.icon || "grid") as any} size={16} color={wsColor} />
                  </View>
                  <Text style={[styles.dropdownLabel, active && styles.dropdownLabelActive]}>{ws.name}</Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function createStyles(colors: any) {
  const suggestions = [
    { icon: "code-slash", label: "Write code" },
    { icon: "bulb", label: "Brainstorm" },
    { icon: "language", label: "Translate" },
    { icon: "search", label: "Research" },
  ];

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerGradient: {
      position: "absolute", top: 0, left: 0, right: 0, height: 200,
    },
    safeArea: { flex: 1 },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 0.5, borderBottomColor: colors.divider,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: -spacing.xs },
    headerOrb: {
      width: 40, height: 40,
      alignItems: "center", justifyContent: "center",
    },
    headerLogo: { width: 36, height: 36, borderRadius: 18, resizeMode: "contain" },
    emptyImage: { width: 120, height: 120, resizeMode: "contain" },
    headerTitle: { ...typography.h3, color: colors.text },
    wsBadge: {
      flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1,
    },
    wsBadgeText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
    headerButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" },

    // Empty state
    convoListContainer: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    emptyContainer: { flex: 1, justifyContent: "center" },
    emptyContent: { alignItems: "center", paddingHorizontal: spacing.xl },
    emptyTitle: { ...typography.h2, color: colors.text, marginTop: spacing.lg },
    emptySubtitle: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.sm, textAlign: "center" },
    suggestionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl, justifyContent: "center" },
    suggestionCard: {
      width: (width - 80) / 2,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: "center",
      borderWidth: 0.5,
      borderColor: colors.glassBorder,
    },
    suggestionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
    suggestionLabel: { ...typography.caption, color: colors.textSecondary },

    // Messages
    messageList: { padding: spacing.md, paddingBottom: spacing.sm },
    doneNotif: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
      backgroundColor: colors.success, paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
      marginHorizontal: spacing.md, marginBottom: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    doneNotifText: { color: "#fff", fontSize: 13, fontWeight: "600" },

    scrollBtn: {
      position: "absolute", bottom: 80, alignSelf: "center",
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
      ...shadows.md,
      borderWidth: 0.5, borderColor: colors.divider,
    },

    // Conversation list
    convoHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      width: "100%", marginBottom: spacing.md, marginTop: spacing.sm,
    },
    convoHeaderTitle: { ...typography.body, color: colors.text, fontWeight: "700", fontSize: 16 },
    newChatBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    newChatBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: "600" },
    convoGroup: { width: "100%", marginBottom: spacing.md },
    convoGroupLabel: { ...typography.caption, color: colors.textTertiary, fontWeight: "600", marginBottom: spacing.sm, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5 },
    convoCard: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
    },
    convoIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: "center", justifyContent: "center",
    },
    convoInfo: { flex: 1, marginLeft: spacing.md },
    convoTitle: { ...typography.body, color: colors.text, fontWeight: "500" },
    convoMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

    // Input
    inputWrapper: {
      marginHorizontal: spacing.md,
      marginBottom: Platform.OS === "ios" ? spacing.xl : spacing.md,
      borderRadius: borderRadius.xxl,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      ...shadows.sm,
    },
    inputWrapperFocused: {
      borderColor: colors.inputBorderFocus,
      ...shadows.md,
    },
    inputBar: {
      flexDirection: "row", alignItems: "flex-end",
      paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    },
    attachBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primaryGlow,
      alignItems: "center", justifyContent: "center",
    },
    input: {
      flex: 1, color: colors.text, fontSize: 16,
      maxHeight: 120, paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    micBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: "center", justifyContent: "center",
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      ...shadows.glow,
    },
    sendBtnDisabled: { backgroundColor: colors.surfaceLighter, shadowOpacity: 0 },

    // Menu
    menuOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end", paddingBottom: 40 },
    menu: {
      marginHorizontal: spacing.lg, backgroundColor: colors.surface,
      borderRadius: borderRadius.lg, padding: spacing.sm,
      ...shadows.lg,
    },
    menuItem: {
      flexDirection: "row", alignItems: "center", gap: spacing.md,
      padding: spacing.md, borderRadius: borderRadius.sm,
    },
    menuLabel: { ...typography.body, color: colors.textSecondary },
    menuDivider: { height: 0.5, backgroundColor: colors.divider, marginHorizontal: spacing.md },

    // Workspace dropdown
    dropdownOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-start", paddingTop: 100 },
    dropdown: {
      marginHorizontal: spacing.lg, backgroundColor: colors.surface,
      borderRadius: borderRadius.lg, padding: spacing.sm,
      ...shadows.lg,
    },
    dropdownItem: {
      flexDirection: "row", alignItems: "center", gap: spacing.sm,
      padding: spacing.md, borderRadius: borderRadius.sm,
    },
    dropdownItemActive: { backgroundColor: colors.primaryGlow },
    dropdownIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    dropdownLabel: { flex: 1, ...typography.body, color: colors.textSecondary },
    dropdownLabelActive: { color: colors.primary, fontWeight: "600" },
  });
}
