import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import { getMe, updateProfile } from "../../services/api";
import { useSessionStore } from "../../store/sessionStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function ProfileScreen() {
  const setSession = useSessionStore((s) => s.setSession);
  const user = useSessionStore((s) => s.user);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    const me = await getMe();
    setFullName(String(me?.fullName || ""));
    setPhone(String(me?.phone || ""));
    await setSession({ user: me });
  }, [setSession]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (e) {
        setError(normalizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const canSave = useMemo(() => {
    return !saving && String(fullName).trim().length >= 2;
  }, [fullName, saving]);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const updated = await updateProfile({
        fullName: String(fullName).trim(),
        phone: String(phone).trim() || undefined,
      });
      await setSession({ user: updated });
      setOk(true);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl }}
        >
          <Text style={[typography.h2, { color: colors.text }]}>Profile</Text>
          <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Update the personal details tied to your TrustyTrade account.</Text>

          <Card elevated style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>{fullName || "Your profile"}</Text>
                <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>{isSeller ? "Seller account" : "Buyer account"}</Text>
              </View>
            </View>

            <Input
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              style={{ marginTop: spacing.lg }}
              icon={<Ionicons name="person-outline" size={18} color={colors.muted} />}
            />
            <Input
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              placeholder="+234..."
              keyboardType="phone-pad"
              icon={<Ionicons name="call-outline" size={18} color={colors.muted} />}
            />

            {!!error ? (
              <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.12), borderWidth: 1, borderColor: alpha(colors.danger, 0.3), padding: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
              </View>
            ) : null}
            {!!ok && !error ? (
              <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.success, 0.12), borderWidth: 1, borderColor: alpha(colors.success, 0.28), padding: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>Profile saved</Text>
              </View>
            ) : null}

            <Button title="Save changes" onPress={onSave} disabled={!canSave} loading={saving} style={{ marginTop: spacing.xl }} leftIcon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.primaryText} />} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
