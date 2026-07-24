import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { updateShipping } from "../../services/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function UpdateShippingScreen({ route, navigation }) {
  const txId = String(route?.params?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => !loading && !!txId, [loading, txId]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await updateShipping(txId, {});
      const tx = res?.body || res;
      navigation.navigate("TransactionDetail", { id: tx?.id || txId, refreshedAt: Date.now() });
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
          <Text style={[typography.small, { color: colors.muted }]}>Seller fulfillment</Text>
          <Text style={[typography.h2, { color: colors.text }]}>Mark as shipped</Text>
          <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Move this order into transit as soon as you have handed it over for delivery.</Text>

          <View
            style={[
              {
                marginTop: spacing.lg,
                borderRadius: radius.xl,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.lg,
                overflow: "hidden",
              },
              shadows.soft,
            ]}
          >
            <View style={{ position: "absolute", right: -30, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: alpha(colors.primary, 0.12) }} />
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
              <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="cube-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>Mark this order as shipped</Text>
                <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
                  This confirms the order has left your side and updates the buyer-facing escrow status immediately.
                </Text>
              </View>
            </View>
          </View>

          <Card elevated style={{ marginTop: spacing.md }}>
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={[typography.small, { color: colors.mutedSoft, flex: 1 }]}>Buyer sees the order move into the shipped state immediately.</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={[typography.small, { color: colors.mutedSoft, flex: 1 }]}>You can still add proof and delivery context later from the order timeline.</Text>
              </View>
            </View>

            {!!error ? (
              <Card style={{ backgroundColor: alpha(colors.danger, 0.12), borderColor: alpha(colors.danger, 0.35), padding: spacing.md, marginTop: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
              </Card>
            ) : null}

            <View style={{ marginTop: spacing.lg }}>
              <Button
                title="Mark as shipped"
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
