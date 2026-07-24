import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { applySeller } from "../../services/api";
import { useSessionStore } from "../../store/sessionStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function SellerApplyScreen() {
  const user = useSessionStore((s) => s.user);
  const [desiredTrustyTag, setDesiredTrustyTag] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  const canSubmit = useMemo(() => {
    const n = String(accountNumber || "").replace(/[^\d]/g, "");
    return !loading && String(bankName).trim().length >= 2 && n.length >= 6 && String(accountName).trim().length >= 2;
  }, [accountName, accountNumber, bankName, loading]);

  const isSeller = String(user?.role || "").toLowerCase() === "seller";
  const isVerified = Boolean(user?.verified || user?.isVerified);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setOk(false);
    try {
      await applySeller({
        desiredTrustyTag: String(desiredTrustyTag).trim() || undefined,
        bankName: String(bankName).trim(),
        accountNumber: String(accountNumber).replace(/[^\d]/g, ""),
        accountName: String(accountName).trim(),
      });
      setOk(true);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}
        >
          <Text style={[typography.small, { color: colors.muted }]}>Seller onboarding</Text>
          <Text style={[typography.h2, { color: colors.text }]}>{isSeller ? "Seller verification" : "Become a seller"}</Text>
          <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
            Submit the payout and identity details required to activate your TrustyTag storefront.
          </Text>

          <View
            style={[
              {
                marginTop: spacing.lg,
                borderRadius: radius.xl,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: isVerified ? alpha(colors.success, 0.35) : alpha(colors.warning, 0.28),
                padding: spacing.lg,
                overflow: "hidden",
              },
              shadows.soft,
            ]}
          >
            <View style={{ position: "absolute", right: -28, top: -36, width: 136, height: 136, borderRadius: 68, backgroundColor: alpha(colors.primary, 0.12) }} />
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
              <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: isVerified ? alpha(colors.success, 0.16) : alpha(colors.warning, 0.16), alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="shield-checkmark-outline" size={20} color={isVerified ? colors.success : colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>
                  {isVerified ? "Verified seller" : isSeller ? "Verification pending" : "Seller application required"}
                </Text>
                <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
                  {isVerified
                    ? "Your seller profile is approved and ready to receive escrow transactions."
                    : "Bank details, account identity, and TrustyTag review must be approved before seller access is fully active."}
                </Text>
              </View>
            </View>
          </View>

          <Card elevated style={{ marginTop: spacing.md }}>
            <Input
              label="Desired TrustyTag"
              value={desiredTrustyTag}
              onChangeText={setDesiredTrustyTag}
              autoCapitalize="none"
              placeholder="@yourbrand"
              icon={<Ionicons name="at-outline" size={18} color={colors.primary} />}
            />
            <Input
              label="Bank name"
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. GTBank"
              icon={<Ionicons name="business-outline" size={18} color={colors.primary} />}
            />
            <Input
              label="Account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              placeholder="Digits only"
              icon={<Ionicons name="card-outline" size={18} color={colors.primary} />}
            />
            <Input
              label="Account name"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Name on bank account"
              icon={<Ionicons name="person-outline" size={18} color={colors.primary} />}
            />

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={[typography.small, { color: colors.mutedSoft, flex: 1 }]}>TrustyTag requests are reviewed alongside payout details.</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={[typography.small, { color: colors.mutedSoft, flex: 1 }]}>Accurate bank information helps avoid payout holds after release.</Text>
              </View>
            </View>

            {!!error ? (
              <Card style={{ backgroundColor: alpha(colors.warning, 0.1), borderColor: alpha(colors.warning, 0.35), padding: spacing.md, marginTop: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
              </Card>
            ) : null}
            {!!ok && !error ? (
              <Card style={{ backgroundColor: alpha(colors.success, 0.1), borderColor: alpha(colors.success, 0.35), padding: spacing.md, marginTop: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>Application submitted. TrustyTrade will review your seller details shortly.</Text>
              </Card>
            ) : null}

            <View style={{ marginTop: spacing.lg }}>
              <Button
                title={isSeller ? "Resubmit details" : "Submit application"}
                onPress={onSubmit}
                disabled={!canSubmit}
                loading={loading}
                leftIcon={!loading ? <Ionicons name="arrow-forward" size={16} color={colors.primaryText} /> : null}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
