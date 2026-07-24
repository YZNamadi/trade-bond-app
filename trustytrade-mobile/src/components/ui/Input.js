import React from "react";
import { Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  autoComplete,
  keyboardType,
  multiline,
  style,
  inputStyle,
  icon,
  rightAccessory,
}) {
  return (
    <View style={[{ marginTop: spacing.md }, style]}>
      {!!label && <Text style={[typography.eyebrow, { color: colors.muted, marginBottom: spacing.xs }]}>{label}</Text>}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          minHeight: multiline ? 110 : 56,
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
        }}
      >
        {icon ? <View style={{ paddingLeft: spacing.md, paddingTop: multiline ? spacing.md : 0 }}>{icon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.45)"
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          multiline={multiline}
          style={[
            {
              flex: 1,
              color: colors.text,
              minHeight: multiline ? 110 : 56,
              paddingLeft: icon ? spacing.sm : spacing.md,
              paddingRight: spacing.md,
              paddingVertical: multiline ? spacing.md : spacing.sm,
              textAlignVertical: multiline ? "top" : "center",
            },
            inputStyle,
          ]}
        />
        {rightAccessory ? <View style={{ paddingRight: spacing.md, justifyContent: "center" }}>{rightAccessory}</View> : null}
      </View>
    </View>
  );
}
