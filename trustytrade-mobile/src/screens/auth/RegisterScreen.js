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
import { applySeller } from "../../services/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

export default function RegisterScreen({ navigation }) {
  const register = useSessionStore((s) => s.register);
  const authError = useSessionStore((s) => s.authError);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [desiredTrustyTag, setDesiredTrustyTag] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => {
    return (
      loading ||
      !String(fullName).trim() ||
      !String(email).trim() ||
      !String(password).trim() ||
      (role === "seller" &&
        (!String(bankName).trim() ||
          !String(accountName).trim() ||
          !String(accountNumber).trim()))
    );
  }, [accountName, accountNumber, bankName, email, fullName, loading, password, role]);

  const onSubmit = async () => {
    if (disabled) return;
    setLoading(true);
    const ok = await register({
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      username: String(username).trim().toLowerCase() || undefined,
      password: String(password),
    });
    if (ok && role === "seller") {
      try {
        await applySeller({
          desiredTrustyTag: String(desiredTrustyTag).trim() || undefined,
          bankName: String(bankName).trim(),
          accountNumber: String(accountNumber).trim(),
          accountName: String(accountName).trim(),
        });
      } catch {}
    }
    setLoading(false);
    if (!ok) return;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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

          <Text style={[typography.h1, { color: colors.text, marginTop: spacing.xxl }]}>Create account</Text>
          <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
            Every new account starts secure. Choose seller to submit onboarding now.
          </Text>

          <View style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {[
                { key: "buyer", label: "Buyer", icon: "bag-handle-outline" },
                { key: "seller", label: "Seller", icon: "storefront-outline" },
              ].map((item) => {
                const active = role === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setRole(item.key)}
                    style={{
                      flex: 1,
                      minHeight: 56,
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.accent : colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: spacing.xs,
                    }}
                  >
                    <Ionicons name={item.icon} size={18} color={active ? colors.primary : colors.muted} />
                    <Text style={[typography.bodyStrong, { color: active ? colors.primary : colors.text }]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Card elevated style={{ padding: spacing.lg, marginTop: spacing.lg }}>
              <Input
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Ada Lovelace"
                style={{ marginTop: 0 }}
                icon={<Ionicons name="person-outline" size={18} color={colors.muted} />}
              />

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                icon={<Ionicons name="mail-outline" size={18} color={colors.muted} />}
              />

              <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="e.g. trustybuyer"
                icon={<Ionicons name="at-outline" size={18} color={colors.muted} />}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                placeholder="At least 6 characters"
                icon={<Ionicons name="lock-closed-outline" size={18} color={colors.muted} />}
              />

              {role === "seller" ? (
                <View
                  style={{
                    marginTop: spacing.lg,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: alpha("#FFFFFF", 0.03),
                    padding: spacing.md,
                  }}
                >
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>Seller onboarding</Text>
                  <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>
                    Submit your payout details so TrustyTrade can review and activate selling.
                  </Text>
                  <Input
                    label="Desired TrustyTag"
                    value={desiredTrustyTag}
                    onChangeText={setDesiredTrustyTag}
                    autoCapitalize="none"
                    placeholder="@techhaven.ng"
                    icon={<Ionicons name="pricetag-outline" size={18} color={colors.muted} />}
                  />
                  <Input
                    label="Bank name"
                    value={bankName}
                    onChangeText={setBankName}
                    autoCapitalize="words"
                    placeholder="Access Bank"
                    icon={<Ionicons name="business-outline" size={18} color={colors.muted} />}
                  />
                  <Input
                    label="Account number"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="number-pad"
                    placeholder="0123456789"
                    icon={<Ionicons name="card-outline" size={18} color={colors.muted} />}
                  />
                  <Input
                    label="Account name"
                    value={accountName}
                    onChangeText={setAccountName}
                    autoCapitalize="words"
                    placeholder="Ada Lovelace"
                    icon={<Ionicons name="person-circle-outline" size={18} color={colors.muted} />}
                  />
                </View>
              ) : null}

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

              <Button title="Create account" onPress={onSubmit} disabled={disabled} loading={loading} style={{ marginTop: spacing.xl }} />
            </Card>

            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.lg }}>
              <Text style={[typography.small, { color: colors.muted }]}>Already have an account? </Text>
              <Pressable onPress={() => navigation.navigate("Login")}>
                <Text style={[typography.small, { color: colors.primary, fontWeight: "700" }]}>Log in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
