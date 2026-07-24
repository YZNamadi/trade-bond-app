import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { getTransaction, initPayment, verifyPayment } from "../../services/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function PaymentScreen({ route, navigation }) {
  const txId = String(route?.params?.id || "");
  const justCreated = Boolean(route?.params?.justCreated);

  const [tx, setTx] = useState(null);
  const [initRes, setInitRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [didAutoOpen, setDidAutoOpen] = useState(false);

  const load = useCallback(async () => {
    const t = await getTransaction(txId);
    setTx(t || null);
  }, [txId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await load();
        const res = await initPayment(txId);
        setInitRes(res || null);
      } catch (e) {
        setError(normalizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [load, txId]);

  const paymentBody = initRes?.body || initRes;
  const provider = String(paymentBody?.provider || (paymentBody?.authorization_url ? "paystack" : "")).toLowerCase();
  const reference = String(paymentBody?.reference || tx?.paymentReference || "").trim();
  const paystackUrl = paymentBody?.authorization_url || paymentBody?.authorizationUrl;
  const transferMode = !paystackUrl && Boolean(paymentBody?.accountNumber);
  const statusLabel =
    provider === "anchor"
      ? "Transfer to fund escrow"
      : provider === "paystack"
        ? "Open secure checkout"
        : "Payment instructions";

  const canOpenLink = useMemo(() => typeof paystackUrl === "string" && paystackUrl.startsWith("http"), [paystackUrl]);
  const canVerify = useMemo(() => !!reference, [reference]);

  useEffect(() => {
    if (!justCreated || didAutoOpen || !canOpenLink) return;
    setShowCheckout(true);
    setDidAutoOpen(true);
  }, [canOpenLink, didAutoOpen, justCreated]);

  const onOpenLink = async () => {
    if (!canOpenLink) return;
    setShowCheckout(true);
  };

  const onVerify = async () => {
    if (!canVerify || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await verifyPayment(txId, { reference });
      const body = res?.body || res;
      const updated = body?.transaction || body;
      if (updated?.id) setTx(updated);
      const parent = navigation.getParent?.();
      if (parent?.navigate) {
        parent.navigate("Transactions", {
          screen: "TransactionDetail",
          params: { id: txId, refreshedAt: Date.now() },
        });
      } else {
        navigation.navigate("TransactionDetail", { id: txId, refreshedAt: Date.now() });
      }
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActionLoading(false);
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
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Pressable onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.muted }]}>Secure payment</Text>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>{statusLabel}</Text>
          </View>
        </View>

        <View
          style={[
            {
              marginTop: spacing.xl,
              borderRadius: radius.xl,
              backgroundColor: colors.surface,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
            },
            shadows.soft,
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>{provider ? provider.toUpperCase() : "Provider pending"}</Text>
              <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>Funds are held securely until the transaction completes.</Text>
            </View>
          </View>

          <View style={{ marginTop: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary, padding: spacing.lg, ...shadows.glow }}>
            <Text style={[typography.eyebrow, { color: alpha("#FFFFFF", 0.78) }]}>Amount</Text>
            <Text style={[typography.h1, { color: "#FFFFFF", marginTop: spacing.xs }]}>
              {Number(tx?.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={[typography.small, { color: alpha("#FFFFFF", 0.8), marginTop: spacing.sm }]}>
              Transaction {String(tx?.id || "").slice(0, 8)}...
            </Text>
          </View>

          {!!reference ? (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <InfoRow label="Reference" value={reference} mono />
              {provider ? <InfoRow label="Provider" value={provider.toUpperCase()} /> : null}
              {paymentBody?.collectionStrategy ? <InfoRow label="Collection mode" value={String(paymentBody.collectionStrategy).replace(/_/g, " ")} /> : null}
            </View>
          ) : null}
        </View>

        {transferMode ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={[typography.eyebrow, { color: colors.muted }]}>Bank transfer details</Text>
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <InfoRow label="Bank" value={String(paymentBody?.bankName || "Anchor bank")} />
              <InfoRow label="Account number" value={String(paymentBody?.accountNumber || "—")} mono />
              <InfoRow label="Account name" value={String(paymentBody?.accountName || "TrustyTrade escrow")} />
              {!!paymentBody?.expiresAt ? <InfoRow label="Expires" value={String(paymentBody.expiresAt)} /> : null}
            </View>
            <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: colors.accent, padding: spacing.md, flexDirection: "row", gap: spacing.sm }}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[typography.small, { color: colors.mutedSoft, flex: 1 }]}>Transfer the exact amount shown above, then use verify once the bank confirms the payment.</Text>
            </View>
          </Card>
        ) : null}

        {canOpenLink ? (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={[typography.eyebrow, { color: colors.muted }]}>In-app checkout</Text>
            <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.sm }]}>
              Complete payment inside TrustyTrade, then close checkout and verify the transaction once the provider confirms success.
            </Text>
          </Card>
        ) : null}

        {!!error ? (
          <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.12), borderWidth: 1, borderColor: alpha(colors.danger, 0.35), padding: spacing.md }}>
            <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Button
            title={provider === "paystack" ? "Open in-app checkout" : "Open provider flow"}
            onPress={onOpenLink}
            disabled={!canOpenLink || actionLoading}
            leftIcon={<Ionicons name="card-outline" size={18} color={colors.primaryText} />}
          />
          <Button
            title="I've paid - Verify"
            variant="secondary"
            onPress={onVerify}
            disabled={!canVerify || actionLoading}
            loading={actionLoading}
            leftIcon={<Ionicons name="checkmark-done-outline" size={18} color={colors.text} />}
          />
        </View>
      </ScrollView>

      <Modal visible={showCheckout} animationType="slide" onRequestClose={() => setShowCheckout(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={[typography.small, { color: colors.muted }]}>Secure checkout</Text>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>Complete payment in app</Text>
            </View>
            <Pressable
              onPress={() => setShowCheckout(false)}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: alpha(colors.primary, 0.06) }}>
            <Text style={[typography.small, { color: colors.mutedSoft }]}>
              Stay inside TrustyTrade to complete checkout. When the provider confirms payment, close this screen and tap verify.
            </Text>
          </View>

          <WebView
            source={{ uri: paystackUrl }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
            style={{ flex: 1, backgroundColor: colors.bg }}
          />

          <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Button
              title="Close checkout and verify"
              onPress={() => setShowCheckout(false)}
              leftIcon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.primaryText} />}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: alpha("#FFFFFF", 0.04), padding: spacing.md }}>
      <Text style={[typography.eyebrow, { color: colors.muted }]}>{label}</Text>
      <Text style={[mono ? typography.small : typography.bodyStrong, { color: colors.text, marginTop: spacing.xs, fontFamily: mono ? "monospace" : undefined }]}>{value}</Text>
    </View>
  );
}
