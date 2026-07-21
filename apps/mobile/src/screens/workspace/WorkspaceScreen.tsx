import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
  ActivityIndicator, Modal, TextInput, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { spacing, borderRadius, typography, shadows } from "../../styles/theme";
import { useTheme } from "../../styles/ThemeProvider";
import { useWorkspaceStore, Workspace } from "../../store/useWorkspaceStore";
import { useChatStore } from "../../store/useChatStore";

const { width } = Dimensions.get("window");
const cardWidth = (width - 48 - 12) / 2;

const iconOptions = [
  { label: "Code", value: "code-slash" },
  { label: "Megaphone", value: "megaphone" },
  { label: "Briefcase", value: "briefcase" },
  { label: "Palette", value: "color-palette" },
  { label: "School", value: "school" },
  { label: "Person", value: "person" },
  { label: "Rocket", value: "rocket" },
  { label: "Heart", value: "heart" },
];

const colorOptions = [
  "#4CAF50", "#FF9800", "#2196F3", "#9C27B0",
  "#00BCD4", "#E91E63", "#607D8B", "#FF5722",
];

export function WorkspaceScreen() {
  const navigation = useNavigation<any>();
  const { workspaces, isLoading, error, showCreateModal, fetchWorkspaces, createWorkspace, deleteWorkspace, setShowCreateModal, clearError } = useWorkspaceStore();
  const { setCurrentWorkspaceId } = useChatStore();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("code-slash");
  const [color, setColor] = useState("#4CAF50");
  const [instruction, setInstruction] = useState("");

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createWorkspace({
      name: name.trim(), description: desc.trim() || undefined, icon, color,
      workspace_type: "custom",
      tools_enabled: [],
      settings: instruction.trim() ? { agent_instruction: instruction.trim() } : undefined,
    });
    setName("");
    setDesc("");
    setIcon("code-slash");
    setColor("#4CAF50");
    setInstruction("");
  };

  const handlePress = (ws: Workspace) => {
    navigation.navigate("WorkspaceDetail", { workspace: ws });
  };

  const handleDelete = (ws: Workspace) => {
    Alert.alert("Hapus Workspace", `Hapus "${ws.name}"?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => deleteWorkspace(ws.id) },
    ]);
  };

  const renderCard = (ws: Workspace) => {
    const wsIcon = ws.icon || "grid";
    const wsColor = ws.color || colors.primary;
    return (
      <TouchableOpacity
        key={ws.id}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handlePress(ws)}
        onLongPress={() => handleDelete(ws)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: wsColor + "15" }]}>
            <Ionicons name={wsIcon as any} size={24} color={wsColor} />
          </View>
          <TouchableOpacity onPress={() => handleDelete(ws)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardName} numberOfLines={1}>{ws.name}</Text>
        {ws.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>{ws.description}</Text>
        )}
        <Text style={styles.cardType}>{ws.workspace_type}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Workspaces</Text>
            <Text style={styles.headerSub}>Tap workspace to start chatting</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading && workspaces.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error && workspaces.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline" size={48} color={colors.textTertiary} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchWorkspaces}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : workspaces.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="grid-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Belum ada workspace</Text>
            <Text style={styles.emptySub}>Buat workspace pertama kamu</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Buat Workspace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.grid}>
              {workspaces.map(renderCard)}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buat Workspace</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); clearError(); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Nama workspace"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Deskripsi (opsional)"
              placeholderTextColor={colors.textTertiary}
              value={desc}
              onChangeText={setDesc}
            />

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconRow}>
              {iconOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.iconOption, icon === opt.value && styles.iconOptionActive]}
                  onPress={() => setIcon(opt.value)}
                >
                  <Ionicons name={opt.value as any} size={20} color={icon === opt.value ? colors.primary : colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Warna</Text>
            <View style={styles.colorRow}>
              {colorOptions.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorOptionActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <Text style={styles.modalLabel}>Agent Instruction</Text>
            <Text style={styles.modalSubLabel}>Deskripsikan bagaimana AI harus bekerja di workspace ini</Text>
            <TextInput
              style={[styles.modalInput, styles.instructionInput]}
              placeholder="Contoh: Kamu adalah asisten coding yang membantu debug dan review code Python. Prioritaskan best practices dan security."
              placeholderTextColor={colors.textTertiary}
              value={instruction}
              onChangeText={setInstruction}
              multiline
              textAlignVertical="top"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, !name.trim() && styles.submitBtnDisabled]}
              onPress={handleCreate}
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Buat</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    safe: { flex: 1 },
    header: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    },
    headerTitle: { ...typography.h2, color: colors.text },
    headerSub: { ...typography.bodySmall, color: colors.textTertiary, marginTop: 2 },
    addBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
      ...shadows.md,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
    errorText: { color: colors.error, ...typography.bodySmall, textAlign: "center", marginTop: spacing.sm },
    retryBtn: {
      marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
      borderRadius: borderRadius.md, backgroundColor: colors.primary,
    },
    retryText: { color: "#fff", ...typography.bodySmall },
    emptyTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md },
    emptySub: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.xs },
    createBtn: {
      flexDirection: "row", alignItems: "center", gap: spacing.sm,
      marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
      borderRadius: borderRadius.md, backgroundColor: colors.primary,
    },
    createBtnText: { color: "#fff", ...typography.bodySmall },
    scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

    card: {
      width: cardWidth,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      ...shadows.sm,
    },
    cardTop: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
      marginBottom: spacing.sm,
    },
    iconBox: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: "center", justifyContent: "center",
    },
    cardName: { ...typography.body, color: colors.text, fontWeight: "600", marginBottom: 2 },
    cardDesc: { ...typography.caption, color: colors.textTertiary },
    cardType: {
      ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs,
      textTransform: "capitalize",
    },

    modalOverlay: {
      flex: 1, backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modal: {
      backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: spacing.xl, paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      marginBottom: spacing.lg,
    },
    modalTitle: { ...typography.h3, color: colors.text },
    modalInput: {
      borderWidth: 1, borderColor: colors.inputBorder, borderRadius: borderRadius.md,
      padding: spacing.md, fontSize: 16, color: colors.text,
      marginBottom: spacing.md,
    },
    modalLabel: { ...typography.body, color: colors.text, fontWeight: "600", marginBottom: spacing.sm },
    modalSubLabel: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.sm, marginTop: -spacing.sm },
    iconRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
    iconOption: {
      width: 40, height: 40, borderRadius: 10,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.surfaceLighter,
    },
    iconOptionActive: { backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary },
    colorRow: { flexDirection: "row", gap: 10, marginBottom: spacing.lg },
    colorOption: { width: 32, height: 32, borderRadius: 16 },
    colorOptionActive: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: colors.text },
    instructionInput: { minHeight: 100, textAlignVertical: "top" },
    submitBtn: {
      backgroundColor: colors.primary, borderRadius: borderRadius.md,
      padding: spacing.md, alignItems: "center",
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitText: { color: "#fff", ...typography.body, fontWeight: "600" },
  });
}
