import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSessionStore } from "../../store/sessionStore";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";

export default function LoginScreen({ navigation }) {
  const login = useSessionStore((s) => s.login);
  const authError = useSessionStore((s) => s.authError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => {
    return loading || !String(email).trim() || !String(password).trim();
  }, [email, password, loading]);

  const onSubmit = async () => {
    if (disabled) return;
    setLoading(true);
    const ok = await login({ email: String(email).trim(), password: String(password) });
    setLoading(false);
    if (!ok) return;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: alpha("#FFFFFF", 0.06), alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>

          <View style={{ marginTop: spacing.xxl }}>
            <Text style={[typography.h1, { color: colors.text }]}>Welcome back</Text>
            <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
              Log in to your buyer or seller account.
            </Text>
          </View>

          <Card elevated style={{ marginTop: spacing.xxl, padding: spacing.lg }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
              style={{ marginTop: 0 }}
              icon={<Ionicons name="mail-outline" size={18} color={colors.muted} />}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              placeholder="••••••••"
              icon={<Ionicons name="lock-closed-outline" size={18} color={colors.muted} />}
              rightAccessory={(
                <Pressable onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
                </Pressable>
              )}
            />

            <View style={{ alignItems: "flex-end", marginTop: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.primary }]}>Forgot password?</Text>
            </View>

            {!!authError && (
              <View
                style={{
                  marginTop: spacing.md,
                  backgroundColor: alpha(colors.danger, 0.12),
                  borderColor: alpha(colors.danger, 0.35),
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <Text style={[typography.small, { color: colors.text }]}>{authError}</Text>
              </View>
            )}

            <Button title="Log in" onPress={onSubmit} disabled={disabled} loading={loading} style={{ marginTop: spacing.xl }} />
          </Card>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
            <Text style={[typography.small, { color: colors.muted }]}>New here? </Text>
            <Pressable onPress={() => navigation.navigate("Register")}>
              <Text style={[typography.small, { color: colors.primary, fontWeight: "700" }]}>Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
