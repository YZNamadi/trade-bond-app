import React from "react";
import { Text, View } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";

export default function SectionHeader({ title, subtitle, style, right }) {
  return (
    <View style={[{ marginTop: spacing.xl, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md }, style]}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.eyebrow, { color: colors.muted }]}>{title}</Text>
        {!!subtitle && <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{subtitle}</Text>}
      </View>
      {right || null}
    </View>
  );
}
