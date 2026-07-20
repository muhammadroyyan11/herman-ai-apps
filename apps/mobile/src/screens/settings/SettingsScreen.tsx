import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, borderRadius, typography, shadows } from "../../styles/theme";
import { useAuthStore } from "../../store/useAuthStore";

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  isDanger?: boolean;
}

function SettingRow({ icon, label, value, isToggle, toggleValue, onToggle, onPress, isDanger }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={isToggle} activeOpacity={0.6}>
      <View style={[styles.settingIcon, { backgroundColor: isDanger ? colors.errorGlow : colors.primaryGlow }]}>
        <Ionicons name={icon as any} size={18} color={isDanger ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.settingLabel, isDanger && { color: colors.error }]}>{label}</Text>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {isToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.surfaceLighter, true: colors.primaryGlowStrong }}
            thumbColor={toggleValue ? colors.primary : colors.textTertiary}
          />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["rgba(74, 158, 255, 0.06)", "transparent"]} style={styles.topGrad} />
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Profile */}
          <TouchableOpacity style={styles.profileCard} activeOpacity={0.7}>
            <LinearGradient colors={[colors.primaryGlow, "transparent"]} style={styles.profileAvatar}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.display_name || "Guest User"}</Text>
              <Text style={styles.profileEmail}>{user?.email || "Not signed in"}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: user?.subscription_tier === "pro" ? colors.primaryGlow : colors.surfaceLighter }]}>
              <Text style={[styles.badgeText, { color: user?.subscription_tier === "pro" ? colors.primary : colors.textTertiary }]}>
                {user?.subscription_tier || "Free"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* AI */}
          <Text style={styles.sectionLabel}>AI Configuration</Text>
          <LinearGradient colors={["rgba(18,18,42,0.6)", "rgba(18,18,42,0.3)"]} style={styles.sectionCard}>
            <SettingRow icon="server" label="AI Provider" value="DeepSeek" />
            <SettingRow icon="chatbubbles" label="Stream Response" isToggle toggleValue={streamEnabled} onToggle={setStreamEnabled} />
            <SettingRow icon="thermometer" label="Temperature" value="0.7" />
            <SettingRow icon="text" label="Max Tokens" value="4096" />
          </LinearGradient>

          {/* App */}
          <Text style={styles.sectionLabel}>Application</Text>
          <LinearGradient colors={["rgba(18,18,42,0.6)", "rgba(18,18,42,0.3)"]} style={styles.sectionCard}>
            <SettingRow icon="moon" label="Dark Mode" isToggle toggleValue={darkMode} onToggle={setDarkMode} />
            <SettingRow icon="notifications" label="Notifications" isToggle toggleValue />
            <SettingRow icon="language" label="Language" value="English" />
            <SettingRow icon="volume-high" label="Voice Output" isToggle toggleValue />
          </LinearGradient>

          {/* Data */}
          <Text style={styles.sectionLabel}>Data & Storage</Text>
          <LinearGradient colors={["rgba(18,18,42,0.6)", "rgba(18,18,42,0.3)"]} style={styles.sectionCard}>
            <SettingRow icon="cloud-download" label="Export Data" />
            <SettingRow icon="trash" label="Clear Local Data" isDanger />
            <SettingRow icon="document-text" label="Cache" value="24 MB" />
          </LinearGradient>

          {/* Account */}
          {isAuthenticated ? (
            <>
              <Text style={styles.sectionLabel}>Account</Text>
              <LinearGradient colors={["rgba(18,18,42,0.6)", "rgba(18,18,42,0.3)"]} style={styles.sectionCard}>
                <SettingRow icon="key" label="API Keys" />
                <SettingRow icon="cloud" label="Cloud Sync" />
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                  <Ionicons name="log-out" size={18} color={colors.error} />
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </LinearGradient>
            </>
          ) : (
            <TouchableOpacity style={styles.loginPrompt} onPress={() => useAuthStore.setState({ isAuthenticated: false })}>
              <Ionicons name="log-in" size={18} color={colors.primary} />
              <Text style={styles.loginPromptText}>Sign in for cloud sync</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* About */}
          <Text style={styles.sectionLabel}>About</Text>
          <LinearGradient colors={["rgba(18,18,42,0.6)", "rgba(18,18,42,0.3)"]} style={styles.sectionCard}>
            <SettingRow icon="information-circle" label="Version" value="1.0.0" />
            <SettingRow icon="shield" label="Privacy" />
            <SettingRow icon="document" label="Terms" />
          </LinearGradient>

          <Text style={styles.footer}>Made with Herman AI</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text },
  scroll: { padding: spacing.lg },

  // Profile
  profileCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: borderRadius.xxl,
    padding: spacing.md, marginBottom: spacing.xl,
    borderWidth: 0.5, borderColor: colors.glassBorder,
    ...shadows.sm,
  },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  profileInfo: { flex: 1, marginLeft: spacing.md },
  profileName: { ...typography.body, color: colors.text, fontWeight: "600" },
  profileEmail: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  // Sections
  sectionLabel: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.sm, marginTop: spacing.sm, marginLeft: spacing.xs },
  sectionCard: { borderRadius: borderRadius.xl, overflow: "hidden", borderWidth: 0.5, borderColor: colors.glassBorder, marginBottom: spacing.sm },
  settingRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.divider,
  },
  settingIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { ...typography.body, color: colors.text, marginLeft: spacing.md, flex: 1 },
  settingRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  settingValue: { ...typography.bodySmall, color: colors.textTertiary },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.md },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: "600" },

  loginPrompt: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.glassBorder, marginBottom: spacing.md,
  },
  loginPromptText: { color: colors.primary, fontSize: 14, fontWeight: "600" },

  footer: { textAlign: "center", color: colors.textTertiary, marginTop: spacing.xl, fontSize: 12 },
});
