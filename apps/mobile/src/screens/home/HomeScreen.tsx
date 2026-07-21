import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing, borderRadius, typography, shadows } from "../../styles/theme";
import { useTheme } from "../../styles/ThemeProvider";
import { useAuthStore } from "../../store/useAuthStore";
import { useWorkspaceStore, Workspace } from "../../store/useWorkspaceStore";
import { useChatStore } from "../../store/useChatStore";
import { api } from "../../services/api";

const { width } = Dimensions.get("window");

interface Conversation {
  id: string;
  title: string;
  message_count: number;
  workspace_id: string | null;
  updated_at: string;
}

const sharedTools = ["web_search", "extract_text_from_url", "calculator", "get_current_time", "get_weather", "currency_converter"];

const quickActions = [
  { icon: "code-slash", label: "Code", color: "#ef5350", desc: "Write & debug", ws: "Developer", instruction: "You are a senior software engineer. Help users write, debug, and review code. Generate clean, idiomatic code with best practices. Analyze code for bugs, performance issues, and security vulnerabilities.", tools: ["server_shell", "file_editor", "git_ops", "db_query", "db_schema", ...sharedTools] },
  { icon: "create-outline", label: "Write", color: "#ff9800", desc: "Content & copy", ws: "Digital Marketing", instruction: "You are a digital marketing content strategist. Help users create compelling marketing copy, social media content, email campaigns, SEO-optimized articles, and brand messaging. Focus on conversion-driven writing and audience engagement.", tools: ["file_editor", "web_search", "extract_text_from_url", "calculator", "get_current_time"] },
  { icon: "search", label: "Research", color: "#e53935", desc: "Web search", ws: "Research", instruction: "You are a research analyst. Help users gather, analyze, and synthesize information from various sources. Provide well-structured summaries, compare findings, and cite sources. Focus on accuracy and depth.", tools: ["web_search", "extract_text_from_url", "calculator", "get_current_time"] },
  { icon: "school-outline", label: "Learn", color: "#9c27b0", desc: "Study", ws: "Learning", instruction: "You are a patient tutor. Help users learn new concepts by breaking them down into digestible parts. Use analogies, examples, and practice exercises. Adapt explanations to the user's knowledge level.", tools: ["web_search", "extract_text_from_url", "calculator", "get_current_time"] },
  { icon: "briefcase-outline", label: "Business", color: "#ff5252", desc: "Analytics", ws: "Business", instruction: "You are a business analyst. Help users with strategic planning, financial analysis, market research, process optimization, and data-driven decision making. Provide actionable insights and clear recommendations.", tools: ["web_search", "db_query", "db_schema", "extract_text_from_url", "calculator", "get_current_time"] },
  { icon: "bulb-outline", label: "Ideas", color: "#ff9800", desc: "Brainstorm", ws: "Creative", instruction: "You are a creative brainstorming partner. Help users generate innovative ideas, explore possibilities, and think outside the box. Use techniques like mind mapping, SCAMPER, and lateral thinking. Build on user input to create something new.", tools: ["web_search", "extract_text_from_url", "calculator", "get_current_time"] },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { workspaces, fetchWorkspaces, createWorkspace } = useWorkspaceStore();
  const { setCurrentWorkspaceId } = useChatStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState({ chats: 0, tools: 0, files: 0 });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    fetchWorkspaces();
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await api.getConversations();
      const convs: Conversation[] = data.conversations || [];
      setConversations(convs.slice(0, 5));
      setStats({
        chats: convs.length,
        tools: 8,
        files: 3,
      });
    } catch {}
  };

  const getConversationWorkspace = useCallback((workspaceId: string | null): string | null => {
    if (!workspaceId) return null;
    const ws = workspaces.find((w) => w.id === workspaceId);
    return ws?.name || null;
  }, [workspaces]);

  const handleQuickAction = async (action: typeof quickActions[0]) => {
    setLoadingAction(action.label);
    try {
      let ws = workspaces.find((w) => w.name === action.ws);
      if (!ws) {
        await createWorkspace({
          name: action.ws,
          description: action.desc,
          icon: action.icon,
          color: action.color,
          workspace_type: "personal",
          settings: { agent_instruction: action.instruction },
          tools_enabled: action.tools,
        });
        await fetchWorkspaces();
        ws = useWorkspaceStore.getState().workspaces.find((w: Workspace) => w.name === action.ws) || null;
      }
      if (ws) {
        navigation.navigate("Workspace", { screen: "WorkspaceDetail", params: { workspace: ws } });
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleWorkspacePress = (wsId: string) => {
    const ws = workspaces.find((w) => w.id === wsId);
    if (ws) {
      navigation.navigate("Workspace", { screen: "WorkspaceDetail", params: { workspace: ws } });
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.display_name?.split(" ")[0] || "there"}</Text>
              <Text style={styles.greetingSub}>What's on your mind today?</Text>
            </View>
            <TouchableOpacity style={styles.profileBtn}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* AI Orb + quick start */}
          <View style={styles.orbSection}>
            <View style={styles.orbCard}>
              <Image source={require("../../../assets/herman_ai.png")} style={styles.orbImage} />
              <Text style={styles.orbTitle}>Ask me anything</Text>
              <Text style={styles.orbSub}>I'm your AI operating system</Text>
              <TouchableOpacity style={styles.orbCta} onPress={() => navigation.navigate("Chat")}>
                <Text style={styles.orbCtaText}>Start a conversation</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                activeOpacity={0.7}
                onPress={() => handleQuickAction(action)}
                disabled={loadingAction === action.label}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + "15" }]}>
                  {loadingAction === action.label ? (
                    <Text style={{ fontSize: 12 }}>⏳</Text>
                  ) : (
                    <Ionicons name={action.icon as any} size={20} color={action.color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDesc}>{action.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Workspaces */}
          {workspaces.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Workspaces</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Workspace")}>
                  <Text style={styles.seeAll}>Manage</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wsScroll}>
                {workspaces.map((ws) => {
                  const wsColor = ws.color || colors.primary;
                  return (
                    <TouchableOpacity
                      key={ws.id}
                      style={styles.wsCard}
                      onPress={() => handleWorkspacePress(ws.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.wsIcon, { backgroundColor: wsColor + "15" }]}>
                        <Ionicons name={(ws.icon || "grid") as any} size={22} color={wsColor} />
                      </View>
                      <Text style={styles.wsName} numberOfLines={1}>{ws.name}</Text>
                      {ws.description && <Text style={styles.wsDesc} numberOfLines={1}>{ws.description}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Recent Conversations */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Chat")}>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {conversations.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Ionicons name="chatbubble-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No conversations yet{workspaces.length > 0 ? "" : "\nCreate a workspace to get started"}</Text>
            </View>
          ) : (
            conversations.map((chat) => {
              const wsName = getConversationWorkspace(chat.workspace_id);
              return (
                <TouchableOpacity key={chat.id} style={styles.chatCard} activeOpacity={0.7}>
                  <View style={[styles.chatIcon, { backgroundColor: colors.primaryLight + "15" }]}>
                    <Ionicons name="chatbubble" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle} numberOfLines={1}>{chat.title}</Text>
                    {wsName && <Text style={styles.chatWorkspace}>{wsName}</Text>}
                    <Text style={styles.chatPreview}>{chat.message_count} messages</Text>
                  </View>
                  <Text style={styles.chatTime}>{timeAgo(chat.updated_at)}</Text>
                </TouchableOpacity>
              );
            })
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => navigation.navigate("Chat")}>
              <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              <Text style={styles.statNumber}>{stats.chats}</Text>
              <Text style={styles.statLabel}>Chats</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => navigation.navigate("Workspace")}>
              <Ionicons name="flash" size={20} color={colors.success} />
              <Text style={styles.statNumber}>{stats.tools}</Text>
              <Text style={styles.statLabel}>Tools</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
              <Ionicons name="documents" size={20} color={colors.warning} />
              <Text style={styles.statNumber}>{stats.files}</Text>
              <Text style={styles.statLabel}>Files</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    safe: { flex: 1 },
    scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

    greetingRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      marginBottom: spacing.lg,
    },
    greeting: { ...typography.h2, color: colors.text },
    greetingSub: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.xs },
    profileBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center", justifyContent: "center",
      ...shadows.sm,
    },

    orbSection: { marginBottom: spacing.xl },
    orbCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: "center",
      ...shadows.md,
    },
    orbImage: { width: 80, height: 80, resizeMode: "contain" },
    orbTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md },
    orbSub: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.xs },
    orbCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: borderRadius.full,
    },
    orbCtaText: { color: "#fff", fontSize: 14, fontWeight: "600" },

    sectionHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      marginBottom: spacing.md, marginTop: spacing.sm,
    },
    sectionTitle: { ...typography.body, color: colors.text, fontWeight: "700", fontSize: 18 },
    seeAll: { ...typography.bodySmall, color: colors.primary },

    wsScroll: { marginBottom: 0, marginLeft: -spacing.lg, paddingLeft: spacing.lg },
    wsCard: {
      backgroundColor: colors.surface, borderRadius: borderRadius.md,
      padding: spacing.md, marginRight: spacing.sm, minWidth: 120,
      alignItems: "center", ...shadows.sm,
    },
    wsIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
    wsName: { ...typography.bodySmall, color: colors.text, fontWeight: "600", marginTop: spacing.xs },
    wsDesc: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },

    actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: spacing.lg },
    actionCard: {
      width: (width - 48 - 12) / 2,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      ...shadows.sm,
    },
    actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    actionLabel: { ...typography.bodySmall, color: colors.text, fontWeight: "600" },
    actionDesc: { ...typography.caption, color: colors.textTertiary, fontSize: 10 },

    chatCard: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.sm,
    },
    chatIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    chatInfo: { flex: 1, marginLeft: spacing.md },
    chatTitle: { ...typography.body, color: colors.text, fontWeight: "600" },
    chatWorkspace: { ...typography.caption, color: colors.primary, fontSize: 10, marginTop: 1 },
    chatPreview: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    chatTime: { ...typography.caption, color: colors.textTertiary },

    emptyRecent: {
      alignItems: "center", justifyContent: "center",
      paddingVertical: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      ...shadows.sm,
    },
    emptyText: { ...typography.bodySmall, color: colors.textTertiary, textAlign: "center", marginTop: spacing.sm },

    statsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: "center",
      ...shadows.sm,
    },
    statNumber: { ...typography.h3, color: colors.text, marginTop: spacing.xs },
    statLabel: { ...typography.caption, color: colors.textSecondary },
  });
}
