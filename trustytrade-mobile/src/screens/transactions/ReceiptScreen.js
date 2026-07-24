import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { getReceipt } from "../../services/api";
import Card from "../../components/ui/Card";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function ReceiptScreen({ route }) {
  const txId = String(route?.params?.id || "");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getReceipt(txId);
        setData(res || null);
      } catch (e) {
        setError(normalizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [txId]);

  const amount = useMemo(() => {
    const num = Number(data?.amount || 0);
    const safe = Number.isFinite(num) ? num : 0;
    return `₦${safe.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [data?.amount]);

  const issuedAt = useMemo(() => {
    const value = data?.updatedAt || data?.createdAt;
    if (!value) return "Pending";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Pending";
    return date.toLocaleString("en-NG", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [data?.createdAt, data?.updatedAt]);

  const statusTone =
    data?.status === "RELEASED" || data?.status === "REFUNDED"
      ? colors.success
      : data?.status === "DISPUTED"
        ? colors.danger
        : data?.status
          ? colors.primary
          : colors.muted;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        <Text style={[typography.h2, { color: colors.text }]}>Receipt</Text>
        <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Escrow settlement details and signed transaction reference.</Text>

        {!!error && (
          <View style={{ marginTop: spacing.md, backgroundColor: alpha(colors.danger, 0.12), borderColor: alpha(colors.danger, 0.35), borderWidth: 1, borderRadius: radius.md, padding: spacing.md }}>
            <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        {!error && data && (
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <View
              style={[
                {
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
              <View style={{ position: "absolute", right: -24, top: -24, width: 120, height: 120, borderRadius: 60, backgroundColor: alpha(colors.primary, 0.12) }} />
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.eyebrow, { color: colors.muted }]}>Signed receipt</Text>
                  <Text style={[typography.h1, { color: colors.text, marginTop: spacing.xs }]}>{amount}</Text>
                  <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.sm }]}>
                    Receipt ID {data?.receiptId || "Pending"}
                  </Text>
                </View>
                <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="receipt-outline" size={22} color={colors.primary} />
                </View>
              </View>
              <View style={{ marginTop: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                <View>
                  <Text style={[typography.caption, { color: colors.muted }]}>Settlement status</Text>
                  <Text style={[typography.bodyStrong, { color: statusTone, marginTop: 2 }]}>{String(data?.status || "PENDING").replace(/_/g, " ")}</Text>
                </View>
                <View style={{ borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.06), borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                  <Text style={[typography.caption, { color: colors.text }]}>{issuedAt}</Text>
                </View>
              </View>
            </View>

            <Card>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>Parties</Text>
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={[typography.small, { color: colors.muted }]}>Buyer</Text>
                  <Text style={[typography.small, { color: colors.text, flex: 1, textAlign: "right" }]}>{data?.buyer?.fullName || "Buyer"}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={[typography.small, { color: colors.muted }]}>Seller</Text>
                  <Text style={[typography.small, { color: colors.text, flex: 1, textAlign: "right" }]}>{data?.seller?.trustyTag || data?.seller?.fullName || data?.seller?.username || "Seller"}</Text>
                </View>
              </View>
            </Card>

            <Card>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>Reference details</Text>
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={[typography.small, { color: colors.muted }]}>Transaction</Text>
                  <Text style={[typography.small, { color: colors.text, flex: 1, textAlign: "right" }]} selectable>{data?.transactionId || txId}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={[typography.small, { color: colors.muted }]}>Payment ref</Text>
                  <Text style={[typography.small, { color: colors.text, flex: 1, textAlign: "right" }]}>{data?.paymentReferenceMasked || "Not available yet"}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={[typography.small, { color: colors.muted }]}>Minor units</Text>
                  <Text style={[typography.small, { color: colors.text, flex: 1, textAlign: "right" }]}>{String(data?.amountMinor || "—")}</Text>
                </View>
              </View>
            </Card>

            <Card>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>Integrity hash</Text>
              <Text style={[typography.small, { color: colors.text, marginTop: spacing.sm }]} selectable>
                {String(data?.receiptHash || "Unavailable")}
              </Text>
              <Pressable style={{ marginTop: spacing.md, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.primary }]}>Generated from the signed transaction record</Text>
              </Pressable>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
