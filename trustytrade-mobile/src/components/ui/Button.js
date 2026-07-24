import React from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";

export default function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  style,
  textStyle,
  leftIcon,
}) {
  const isDisabled = Boolean(disabled || loading);
  const backgroundColor =
    variant === "primary"
      ? isDisabled
        ? alpha(colors.primary, 0.35)
        : colors.primary
      : variant === "danger"
        ? isDisabled
          ? alpha(colors.danger, 0.3)
          : colors.danger
        : variant === "ghost"
          ? "transparent"
          : alpha("#FFFFFF", isDisabled ? 0.04 : 0.06);

  const color =
    variant === "primary" || variant === "danger" ? colors.primaryText : colors.text;

  const border =
    variant === "primary" || variant === "danger"
      ? { borderWidth: 0, borderColor: "transparent" }
      : variant === "ghost"
        ? { borderWidth: 0, borderColor: "transparent" }
        : { borderWidth: 1, borderColor: colors.border };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: spacing.sm,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...border,
        },
        variant === "primary" && !isDisabled ? shadows.glow : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {leftIcon || null}
          <Text style={[typography.bodyStrong, { color }, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
