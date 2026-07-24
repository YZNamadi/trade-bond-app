import { DarkTheme } from "@react-navigation/native";

export const colors = {
  bg: "#050505",
  surface: "rgba(255, 255, 255, 0.05)",
  surface2: "rgba(255, 255, 255, 0.08)",
  surface3: "#0B0B0B",
  text: "#FFFFFF",
  muted: "#B3B3B3",
  mutedSoft: "rgba(255, 255, 255, 0.62)",
  border: "rgba(255, 255, 255, 0.08)",
  primary: "#32D46F",
  primaryGlow: "#00FF66",
  primaryText: "#050505",
  accent: "rgba(50, 212, 111, 0.16)",
  danger: "#E74C3C",
  success: "#32D46F",
  warning: "#F1C40F",
  overlay: "rgba(5, 5, 5, 0.82)",
};

export const spacing = {
  xxs: 6,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 28,
  full: 999,
};

export const typography = {
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  h1: { fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.8 },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.4 },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "500" },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
};

export const shadows = {
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  soft: {
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

export const gradients = {
  primary: [colors.primary, colors.primaryGlow],
};

export const layout = {
  screenPadding: spacing.lg,
  screenTop: spacing.xl,
  contentGap: spacing.lg,
};

export function alpha(hex, opacity) {
  if (!hex || typeof hex !== "string") return hex;
  if (hex.startsWith("rgba") || hex.startsWith("rgb") || hex.startsWith("hsla") || hex.startsWith("hsl")) {
    return hex;
  }
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = Number.parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const theme = {
  colors,
  spacing,
  radius,
  shadows,
  gradients,
  layout,
  typography,
  navigation: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  },
};
