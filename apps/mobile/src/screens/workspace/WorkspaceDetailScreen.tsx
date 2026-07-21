import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing, borderRadius, typography, shadows } from "../../styles/theme";
import { useTheme } from "../../styles/ThemeProvider";
import { useWorkspaceStore, Workspace } from "../../store/useWorkspaceStore";
import { useChatStore } from "../../store/useChatStore";
import { api } from "../../services/api";

interface Conversation {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export function WorkspaceDetailScreen({ route, navigation }: any) {
  const { workspace: initialWs } = route.params as { workspace: Workspace };
  const { updateWorkspace, deleteWorkspace } = useWorkspaceStore();
  const { setCurrentWorkspaceId } = useChatStore();

  const [workspace, setWorkspace] = useState(initialWs);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [instruction, setInstruction] = useState(workspace.settings?.agent_instruction || "");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoadingConvs(true);
    try {
      const { data } = await api.getConversations(workspace.id);
      setConversations(data.conversations || []);
    } catch {} finally {
      setLoadingConvs(false);
    }
  };

  const toggleTool = (toolId: string) => {
    setTools((prev) =>
      prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId]
    );
  };

  const handleSave = async () => {
    await updateWorkspace(workspace.id, {
      name, description,
      settings: instruction.trim() ? { agent_instruction: instruction.trim() } : { agent_instruction: null },
    });
    setWorkspace((prev) => ({ ...prev, name, description, settings: instruction.trim() ? { agent_instruction: instruction.trim() } : {} }));
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert("Hapus Workspace", `Yakin hapus "${workspace.name}"? Semua percakapan terkait akan tetap ada.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive",
        onPress: async () => {
          await deleteWorkspace(workspace.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleStartChat = () => {
    setCurrentWorkspaceId(workspace.id);
    useChatStore.getState().clearChat();
    navigation.navigate("Chat");
  };

  const handleOpenConversation = (conv: Conversation) => {
    setCurrentWorkspaceId(workspace.id);
    loadConversation(conv.id);
    navigation.navigate("Chat");
  };

  const loadConversation = async (convId: string) => {
    try {
      const { data } = await api.getConversation(convId);
      useChatStore.getState().setCurrentConversation(convId);
      useChatStore.getState().setMessages(data.messages || []);
    } catch {}
  };

  const wsIcon = workspace.icon || "grid";
  const wsColor = workspace.color || colors.primary;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workspace</Text>
          <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
            <Text style={[styles.editBtn, isEditing && styles.editBtnActive]}>
              {isEditing ? "Save" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.heroSection}>
            <View style={[styles.heroIcon, { backgroundColor: wsColor + "15" }]}>
              <Ionicons name={wsIcon as any} size={48} color={wsColor} />
            </View>

            {isEditing ? (
              <>
                <TextInput style={styles.editName} value={name} onChangeText={setName} placeholderTextColor={colors.textTertiary} />
                <TextInput style={styles.editDesc} value={description} onChangeText={setDescription} multiline placeholderTextColor={colors.textTertiary} />
              </>
            ) : (
              <>
                <Text style={styles.heroName}>{workspace.name}</Text>
                {workspace.description && <Text style={styles.heroDesc}>{workspace.description}</Text>}
                <View style={styles.heroMeta}>
                  <Text style={styles.heroType}>{workspace.workspace_type}</Text>
                  <Text style={styles.heroDot}>•</Text>
                  <Text style={styles.heroChats}>{conversations.length} chats</Text>
                </View>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.startChatBtn} onPress={handleStartChat}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            <Text style={styles.startChatText}>Start Chat</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agent Instruction</Text>
            <Text style={styles.sectionSub}>Deskripsi bagaimana AI harus bekerja di workspace ini</Text>
            {isEditing ? (
              <TextInput
                style={styles.editInstruction}
                value={instruction}
                onChangeText={setInstruction}
                multiline
                textAlignVertical="top"
                placeholder="Contoh: Kamu adalah asisten coding..."
                placeholderTextColor={colors.textTertiary}
              />
            ) : instruction ? (
              <View style={styles.instructionBox}>
                <Text style={styles.instructionRole}>{instruction.match(/^(You are a[^.]+\.)/)?.[1] || instruction}</Text>
                <Text style={styles.instructionText}>{instruction.replace(/^You are a[^.]+\.\s*/, "")}</Text>
              </View>
            ) : (
              <Text style={styles.instructionEmpty}>Belum ada instruksi</Text>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Conversations</Text>
              <TouchableOpacity onPress={fetchConversations}>
                <Ionicons name="refresh" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {loadingConvs ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.md }} />
            ) : conversations.length === 0 ? (
              <View style={styles.emptyConvs}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyConvsText}>Belum ada percakapan</Text>
              </View>
            ) : (
              conversations.map((conv) => (
                <TouchableOpacity key={conv.id} style={styles.convCard} onPress={() => handleOpenConversation(conv)}>
                  <View style={styles.convInfo}>
                    <Text style={styles.convTitle} numberOfLines={1}>{conv.title}</Text>
                    <Text style={styles.convMeta}>{conv.message_count} messages</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))
            )}
          </View>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteText}>Hapus Workspace</Text>
          </TouchableOpacity>

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
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 0.5, borderBottomColor: colors.divider,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    headerTitle: { ...typography.h3, color: colors.text },
    editBtn: { ...typography.body, color: colors.primary, fontWeight: "600" },
    editBtnActive: { color: colors.success },
    scroll: { paddingHorizontal: spacing.lg },

    heroSection: { alignItems: "center", paddingVertical: spacing.xl },
    heroIcon: { width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
    heroName: { ...typography.h2, color: colors.text },
    heroDesc: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.xs, textAlign: "center" },
    heroMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
    heroType: { ...typography.caption, color: colors.textSecondary, textTransform: "capitalize" },
    heroDot: { color: colors.textTertiary },
    heroChats: { ...typography.caption, color: colors.textSecondary },
    editName: {
      ...typography.h2, color: colors.text, textAlign: "center", borderBottomWidth: 1,
      borderBottomColor: colors.primary, paddingBottom: spacing.xs, marginBottom: spacing.sm,
      minWidth: 200,
    },
    editDesc: {
      ...typography.bodySmall, color: colors.text, textAlign: "center",
      borderWidth: 1, borderColor: colors.inputBorder, borderRadius: borderRadius.sm,
      padding: spacing.sm, width: "100%", minHeight: 60,
    },

    startChatBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
      backgroundColor: colors.primary, borderRadius: borderRadius.md,
      padding: spacing.md, marginBottom: spacing.xl,
      ...shadows.md,
    },
    startChatText: { color: "#fff", ...typography.body, fontWeight: "600" },

    section: { marginBottom: spacing.xl },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sectionTitle: { ...typography.body, color: colors.text, fontWeight: "700", fontSize: 16 },
    sectionSub: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md },

    editInstruction: {
      borderWidth: 1, borderColor: colors.inputBorder, borderRadius: borderRadius.md,
      padding: spacing.md, fontSize: 14, color: colors.text, minHeight: 100,
      textAlignVertical: "top",
    },
    instructionBox: {
      backgroundColor: colors.surfaceLighter, borderRadius: borderRadius.md,
      padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    instructionRole: {
      ...typography.body, color: colors.primary, fontWeight: "700",
      fontSize: 15, marginBottom: spacing.xs,
    },
    instructionText: { ...typography.bodySmall, color: colors.text, lineHeight: 20 },
    instructionEmpty: { ...typography.bodySmall, color: colors.textTertiary, fontStyle: "italic" },

    emptyConvs: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
    emptyConvsText: { ...typography.bodySmall, color: colors.textTertiary },

    convCard: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.surface, borderRadius: borderRadius.md,
      padding: spacing.md, marginTop: spacing.sm,
      ...shadows.sm,
    },
    convInfo: { flex: 1 },
    convTitle: { ...typography.body, color: colors.text, fontWeight: "500" },
    convMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

    deleteBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
      padding: spacing.md, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: colors.error,
    },
    deleteText: { color: colors.error, ...typography.body, fontWeight: "600" },
  });
}
