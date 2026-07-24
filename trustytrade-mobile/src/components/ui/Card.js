import React from "react";
import { View } from "react-native";
import { colors, radius, spacing, shadows } from "../../constants/theme";

export default function Card({ children, style, padded = true, elevated = false }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
        },
        elevated ? shadows.soft : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
