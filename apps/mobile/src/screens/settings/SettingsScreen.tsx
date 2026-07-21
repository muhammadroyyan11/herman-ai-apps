import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, borderRadius, typography, shadows } from "../../styles/theme";
import { useTheme } from "../../styles/ThemeProvider";
import { useAuthStore } from "../../store/useAuthStore";
import { deleteLocal, removeToken } from "../../utils/storage";

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

function SettingRow({ icon, label, value, isToggle, toggleValue, onToggle, onPress, isDanger, colors }: SettingRowProps & { colors: any }) {
  return (
    <TouchableOpacity style={createStyles(colors).settingRow} onPress={onPress} disabled={isToggle} activeOpacity={0.6}>
      <View style={[createStyles(colors).settingIcon, { backgroundColor: isDanger ? colors.errorGlow : colors.primaryGlow }]}>
        <Ionicons name={icon as any} size={18} color={isDanger ? colors.error : colors.primary} />
      </View>
      <Text style={[createStyles(colors).settingLabel, isDanger && { color: colors.error }]}>{label}</Text>
      <View style={createStyles(colors).settingRight}>
        {value && <Text style={createStyles(colors).settingValue}>{value}</Text>}
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

export function SettingsScreen({ navigation }: any) {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuthStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleExport = useCallback(() => {
    Alert.alert("Export Data", "Your data will be exported. This feature will be available soon.");
  }, []);

  const handleClearData = useCallback(() => {
    Alert.alert(
      "Clear Local Data",
      "This will clear all locally stored data including cached messages and settings. Your account data on the server will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear", style: "destructive",
          onPress: () => {
            deleteLocal("theme_mode");
            Alert.alert("Done", "Local data cleared successfully.");
          },
        },
      ]
    );
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  }, [logout]);

  const handleProfilePress = useCallback(() => {
    if (isAuthenticated) {
      Alert.alert("Edit Profile", "Profile editing will be available soon.");
    } else {
      navigation.navigate("Auth");
    }
  }, [isAuthenticated, navigation]);

  const handleVersion = useCallback(() => {
    Alert.alert("Herman AI", "Version 1.0.0\n\nYour AI Operating System");
  }, []);

  const handlePrivacy = useCallback(() => {
    Alert.alert("Privacy Policy", "Privacy policy will be available soon.");
  }, []);

  const handleTerms = useCallback(() => {
    Alert.alert("Terms of Service", "Terms of service will be available soon.");
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primaryGlow, "transparent"]} style={styles.topGrad} />
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Profile */}
          <TouchableOpacity style={styles.profileCard} onPress={handleProfilePress} activeOpacity={0.7}>
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

          {/* Application */}
          <Text style={styles.sectionLabel}>Application</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="moon" label="Dark Mode" isToggle toggleValue={mode === "dark"} onToggle={toggleTheme} colors={colors} />
            <SettingRow icon="notifications" label="Notifications" isToggle toggleValue onToggle={() => {}} colors={colors} />
            <SettingRow icon="language" label="Language" value="English" colors={colors} />
            <SettingRow icon="volume-high" label="Voice Output" isToggle toggleValue={false} onToggle={() => Alert.alert("Coming Soon", "Voice output will be available in a future update.")} colors={colors} />
          </View>

          {/* Data & Storage */}
          <Text style={styles.sectionLabel}>Data & Storage</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="cloud-download" label="Export Data" onPress={handleExport} colors={colors} />
            <SettingRow icon="trash" label="Clear Local Data" isDanger onPress={handleClearData} colors={colors} />
          </View>

          {/* Account */}
          {isAuthenticated ? (
            <>
              <Text style={styles.sectionLabel}>Account</Text>
              <View style={styles.sectionCard}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Ionicons name="log-out" size={18} color={colors.error} />
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity style={styles.loginPrompt} onPress={() => navigation.navigate("Auth")}>
              <Ionicons name="log-in" size={18} color={colors.primary} />
              <Text style={styles.loginPromptText}>Sign in for cloud sync</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* About */}
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.sectionCard}>
            <SettingRow icon="information-circle" label="Version" value="1.0.0" onPress={handleVersion} colors={colors} />
            <SettingRow icon="shield" label="Privacy" onPress={handlePrivacy} colors={colors} />
            <SettingRow icon="document" label="Terms" onPress={handleTerms} colors={colors} />
          </View>

          <Text style={styles.footer}>Made with Herman AI</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
    safe: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    headerTitle: { ...typography.h2, color: colors.text },
    scroll: { padding: spacing.lg },

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
}
