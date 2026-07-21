import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Dimensions, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, borderRadius, typography, shadows } from "../../styles/theme";
import { useTheme } from "../../styles/ThemeProvider";
import { useAuthStore } from "../../store/useAuthStore";

const { width } = Dimensions.get("window");

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const { colors } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSubmit = async () => {
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, username, password);
      }
    } catch {}
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image source={require("../../../assets/herman_ai.png")} style={styles.logoImage} />
        <Text style={styles.title}>Herman AI</Text>
        <Text style={styles.subtitle}>Your AI Operating System</Text>
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{isLogin ? "Welcome back" : "Create account"}</Text>
        <Text style={styles.formSubtitle}>
          {isLogin ? "Sign in to continue" : "Start your AI journey"}
        </Text>

        <View style={styles.formFields}>
          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 44 }]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{isLogin ? "Sign In" : "Create Account"}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsLogin(!isLogin); clearError(); }}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Text style={styles.switchHighlight}>{isLogin ? "Sign Up" : "Sign In"}</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.guestBtn} onPress={() => useAuthStore.setState({ isAuthenticated: true, isLoading: false })} activeOpacity={0.7}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: any) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: "center", paddingHorizontal: spacing.lg },
  logoSection: { alignItems: "center", marginBottom: spacing.xl },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  subtitle: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.xs },
  logoImage: { width: 100, height: 100, resizeMode: "contain" },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  formTitle: { ...typography.h3, color: colors.text },
  formSubtitle: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.xs, marginBottom: spacing.lg },
  formFields: { gap: spacing.md },

  inputGroup: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceLighter,
    borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.inputBorder,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1, color: colors.text, fontSize: 15,
    paddingVertical: 14,
  },
  eyeBtn: { position: "absolute", right: spacing.md, padding: spacing.xs },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.errorGlow,
    padding: spacing.sm, borderRadius: borderRadius.sm,
  },
  errorText: { color: colors.error, fontSize: 13 },

  submitBtn: { borderRadius: borderRadius.sm, overflow: "hidden", marginTop: spacing.xs },
  submitGradient: { paddingVertical: spacing.md + 2, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  switchText: { textAlign: "center", color: colors.textTertiary, fontSize: 14 },
  switchHighlight: { color: colors.primary },

  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: colors.divider },
  dividerText: { color: colors.textTertiary, fontSize: 12 },

  guestBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    padding: spacing.md, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.inputBorder,
  },
  guestBtnText: { color: colors.textSecondary, fontSize: 15, flex: 1, textAlign: "center" },
}); }
