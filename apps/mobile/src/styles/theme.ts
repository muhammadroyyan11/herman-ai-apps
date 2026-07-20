export const colors = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceLight: "#fafafa",
  surfaceLighter: "#f5f5f5",

  primary: "#e53935",
  primaryDark: "#c62828",
  primaryLight: "#ef5350",
  primaryGlow: "rgba(229, 57, 53, 0.1)",
  primaryGlowStrong: "rgba(229, 57, 53, 0.2)",

  accent: "#ff5252",
  accentGlow: "rgba(255, 82, 82, 0.1)",

  text: "#1a1a1a",
  textSecondary: "#666666",
  textTertiary: "#999999",

  success: "#4caf50",
  successGlow: "rgba(76, 175, 80, 0.1)",
  warning: "#ff9800",
  warningGlow: "rgba(255, 152, 0, 0.1)",
  error: "#e53935",
  errorGlow: "rgba(229, 57, 53, 0.1)",

  glass: "#ffffff",
  glassBorder: "#e0e0e0",
  glassBorderActive: "#e53935",

  userBubble: "#e53935",
  userBubbleBorder: "rgba(229, 57, 53, 0.3)",
  assistantBubble: "#f5f5f5",
  assistantBubbleBorder: "#e0e0e0",

  inputBg: "#f5f5f5",
  inputBorder: "#e0e0e0",
  inputBorderFocus: "#e53935",

  divider: "#eeeeee",
  overlay: "rgba(0, 0, 0, 0.5)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 34, fontWeight: "700" as const, lineHeight: 42, letterSpacing: -0.5 },
  h2: { fontSize: 26, fontWeight: "600" as const, lineHeight: 34, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16, letterSpacing: 0.2 },
  label: { fontSize: 11, fontWeight: "600" as const, lineHeight: 14, letterSpacing: 0.8, textTransform: "uppercase" as const },
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};
