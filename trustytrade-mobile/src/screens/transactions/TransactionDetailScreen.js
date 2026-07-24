import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { confirmDelivery, getDisputeByTransaction, getTransaction, listTransactionEvents, openDispute } from "../../services/api";
import { useSessionStore } from "../../store/sessionStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import TransactionTimeline from "../../components/transactions/TransactionTimeline";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

function formatMoney(amount, currency) {
  const num = Number(amount || 0);
  const fixed = Number.isFinite(num) ? num : 0;
  const major = fixed.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = String(currency || "").toUpperCase() === "NGN" ? "₦" : "";
  return `${symbol}${major}`;
}

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  const tone =
    s === "RELEASED" || s === "REFUNDED"
      ? colors.success
      : s === "DISPUTED"
        ? colors.danger
        : s === "RELEASE_PENDING" || s === "REFUND_PENDING"
          ? colors.warning
          : colors.primary;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        backgroundColor: alpha("#FFFFFF", 0.06),
        borderColor: colors.border,
        borderWidth: 1,
      }}
    >
      <Text style={[typography.caption, { color: tone }]}>{s || "—"}</Text>
    </View>
  );
}

function statusCopy(status, isSeller) {
  const s = String(status || "").toUpperCase();
  if (s === "CREATED" || s === "PENDING") return { label: "Awaiting payment", sub: isSeller ? "The buyer still needs to fund escrow before you can ship." : "Fund escrow to secure this deal." };
  if (s === "FUNDED") return { label: isSeller ? "Ready to ship" : "In escrow", sub: isSeller ? "Escrow is funded. Mark the order as shipped once handoff is complete." : "Funds are protected while the seller prepares delivery." };
  if (s === "SHIPPED") return { label: isSeller ? "In transit" : "Awaiting confirmation", sub: isSeller ? "The order is marked as shipped while the buyer waits to confirm delivery." : "Confirm delivery to release funds to the seller." };
  if (s === "DELIVERED") return { label: "Confirming", sub: "The provider is finalizing the delivery confirmation." };
  if (s === "RELEASE_PENDING") return { label: "Release processing", sub: isSeller ? "Your payout is being processed by the provider." : "Payout is being processed by the provider." };
  if (s === "RELEASED") return { label: "Completed", sub: isSeller ? "Funds were released to your payout destination." : "Escrow was released successfully." };
  if (s === "DISPUTED") return { label: "Disputed", sub: "Escrow is frozen while the dispute is reviewed." };
  if (s === "REFUND_PENDING") return { label: "Refund processing", sub: "Refund is being processed by the provider." };
  if (s === "REFUNDED") return { label: "Refunded", sub: "Funds were returned to the buyer." };
  return { label: "Active", sub: "Transaction in progress." };
}

export default function TransactionDetailScreen({ route, navigation }) {
  const txId = String(route?.params?.id || "");
  const refreshedAt = Number(route?.params?.refreshedAt || 0);
  const me = useSessionStore((s) => s.user);

  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [linkedDisputeId, setLinkedDisputeId] = useState(null);

  const load = useCallback(async () => {
    const res = await getTransaction(txId);
    setTx(res || null);
  }, [txId]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await listTransactionEvents(txId);
      setEvents(Array.isArray(res) ? res : []);
    } finally {
      setEventsLoading(false);
    }
  }, [txId]);

  const loadDispute = useCallback(async () => {
    try {
      const res = await getDisputeByTransaction(txId);
      setLinkedDisputeId(res?.id ? String(res.id) : null);
    } catch {
      setLinkedDisputeId(null);
    }
  }, [txId]);

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([load(), loadEvents(), loadDispute()]);
    } catch (e) {
      setError(normalizeError(e));
    }
  }, [load, loadDispute, loadEvents]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([load(), loadEvents(), loadDispute()]);
      } catch (e) {
        setError(normalizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [load, loadDispute, loadEvents, refreshedAt]);

  const status = String(tx?.status || "").toUpperCase();
  const role = String(me?.role || "").toLowerCase();

  const isBuyer = role === "buyer";
  const isSeller = role === "seller";

  const canPay = isBuyer && (status === "CREATED" || status === "PENDING");
  const canConfirmDelivery = isBuyer && status === "SHIPPED";
  const canUpdateShipping = isSeller && status === "FUNDED";
  const canUploadProof = isSeller && ["FUNDED", "SHIPPED", "DELIVERED", "RELEASE_PENDING", "RELEASED", "DISPUTED"].includes(status);
  const canDispute = status && !["REFUNDED", "RELEASED"].includes(status);
  const disputeId = linkedDisputeId || tx?.dispute?.id || tx?.disputeId || null;

  const onConfirmDelivery = async () => {
    if (!canConfirmDelivery || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await confirmDelivery(txId);
      const body = res?.body || res;
      setTx(body || tx);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const onOpenDispute = async () => {
    if (!canDispute || actionLoading) return;
    if (disputeId) {
      navigation.navigate("DisputeDetail", { id: disputeId });
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await openDispute(txId);
      const body = res?.body || res;
      const nextDisputeId = body?.id || body?.dispute?.id || null;
      setLinkedDisputeId(nextDisputeId ? String(nextDisputeId) : null);
      await load();
      if (nextDisputeId) navigation.navigate("DisputeDetail", { id: nextDisputeId });
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const counterpart = useMemo(() => {
    if (!tx) return null;
    if (isBuyer) return tx?.seller;
    if (isSeller) return tx?.buyer;
    return tx?.seller || tx?.buyer || null;
  }, [isBuyer, isSeller, tx]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const summary = statusCopy(status, isSeller);
  const payoutLabel =
    status === "RELEASE_PENDING"
      ? "Payout processing"
      : status === "RELEASED"
        ? "Payout sent"
        : status === "DISPUTED"
          ? "Payout paused"
          : status === "REFUND_PENDING" || status === "REFUNDED"
            ? "No seller payout"
            : "Payout pending release";
  const payoutCopy =
    status === "RELEASE_PENDING"
      ? "The provider is moving escrow into your payout destination."
      : status === "RELEASED"
        ? "Escrow release completed successfully for this order."
        : status === "DISPUTED"
          ? "Release is frozen while support reviews the case."
          : status === "REFUND_PENDING" || status === "REFUNDED"
            ? "This order is resolving toward the buyer, so seller payout is not active."
            : "Payout becomes eligible after buyer confirmation and final release.";
  const sellerPrimaryAction =
    status === "FUNDED"
      ? { title: "Mark as shipped", screen: "UpdateShipping", params: { id: txId }, icon: "cube-outline" }
      : status === "SHIPPED"
        ? { title: "Add delivery proof", screen: "DeliveryProofs", params: { id: txId }, icon: "document-text-outline" }
        : disputeId
          ? { title: "Open dispute", screen: "DisputeDetail", params: { id: disputeId }, icon: "warning-outline" }
          : { title: "Open chat", screen: "Chat", params: { id: txId }, icon: "chatbubble-ellipses-outline" };
  const trustScore = Math.max(
    0,
    Math.min(
      99,
      92 +
        (tx?.seller?.trustyTag ? 2 : 0) +
        (["FUNDED", "SHIPPED", "DELIVERED", "RELEASED"].includes(status) ? 3 : 0) -
        (status === "DISPUTED" ? 15 : 0),
    ),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[typography.small, { color: colors.muted }]}>{isSeller ? "Active order" : "Active transaction"}</Text>
            <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
              {tx?.title || counterpart?.trustyTag || counterpart?.fullName || counterpart?.email || "Transaction"}
            </Text>
          </View>
          <StatusPill status={status} />
        </View>

        {!!error && (
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
            <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        <View
          style={[
            {
              marginTop: spacing.xl,
              borderRadius: radius.xl,
              backgroundColor: colors.surface,
              padding: spacing.lg,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: alpha("#FFFFFF", 0.1),
            },
            shadows.soft,
          ]}
        >
          <View style={{ position: "absolute", top: -120, left: "50%", marginLeft: -160, width: 320, height: 320, borderRadius: 160, backgroundColor: alpha(colors.primary, 0.14) }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>Amount in escrow</Text>
              <Text style={[typography.h1, { color: colors.text, marginTop: spacing.xs }]}>{formatMoney(tx?.amount, tx?.currency)}</Text>
              <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" }}>
                <View style={{ borderRadius: radius.full, backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.primary }]}>Protected by provider</Text>
                </View>
                <View style={{ borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.06), paddingHorizontal: spacing.sm, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.text }]}>{trustScore}% Trusted</Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>Status</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.xs }]}>{summary.label}</Text>
            </View>
          </View>

          <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.md }]}>{summary.sub}</Text>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Card style={{ backgroundColor: alpha("#FFFFFF", 0.04), padding: spacing.md }}>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>Buyer</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.xs }]}>{tx?.buyer?.fullName || "Buyer"}</Text>
            </Card>
            <Card style={{ backgroundColor: alpha("#FFFFFF", 0.04), padding: spacing.md }}>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>Seller</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.xs }]}>{tx?.seller?.trustyTag || tx?.seller?.fullName || tx?.seller?.username || "Seller"}</Text>
            </Card>
          </View>
        </View>

        <SectionHeader
          title="Transaction details"
          subtitle="Reference, created time, and shipping status"
          right={<Pressable onPress={refreshAll}><Text style={[typography.caption, { color: colors.primary }]}>{eventsLoading ? "Refreshing..." : "Refresh"}</Text></Pressable>}
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Card style={{ padding: spacing.md }}>
            <Text style={[typography.eyebrow, { color: colors.muted }]}>Reference</Text>
            <Text style={[typography.small, { color: colors.text, marginTop: spacing.xs }]} selectable>{String(tx?.id || "—")}</Text>
          </Card>
          <Card style={{ padding: spacing.md }}>
            <Text style={[typography.eyebrow, { color: colors.muted }]}>Description</Text>
            <Text style={[typography.small, { color: colors.text, marginTop: spacing.xs }]}>{tx?.description || "No description provided."}</Text>
          </Card>
          <Card style={{ padding: spacing.md }}>
            <Text style={[typography.eyebrow, { color: colors.muted }]}>Shipping reference</Text>
            <Text style={[typography.small, { color: colors.text, marginTop: spacing.xs }]} selectable>{tx?.trackingId ? String(tx.trackingId) : status === "SHIPPED" ? "Marked as shipped" : "Not marked as shipped yet"}</Text>
          </Card>
        </View>

        {isSeller ? (
          <>
            <SectionHeader title="Seller payout" subtitle="Release timing and payout readiness" />
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Card style={{ padding: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>{payoutLabel}</Text>
                    <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>{payoutCopy}</Text>
                  </View>
                  <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: alpha(colors.primary, 0.16), alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                  </View>
                </View>
              </Card>
              <Pressable onPress={() => navigation.getParent?.()?.navigate?.("Earnings")}>
                <Card style={{ padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>Open earnings</Text>
                    <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Review released payouts and seller revenue history.</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </Card>
              </Pressable>
            </View>
          </>
        ) : null}

        <SectionHeader title={isSeller ? "Order actions" : "Actions"} subtitle={isSeller ? "Seller tools for shipping, proofs, and issue handling" : "Next steps for this escrow"} />
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {isSeller ? (
            <Button
              title={sellerPrimaryAction.title}
              onPress={() => navigation.navigate(sellerPrimaryAction.screen, sellerPrimaryAction.params)}
              leftIcon={<Ionicons name={sellerPrimaryAction.icon} size={18} color={colors.primaryText} />}
            />
          ) : null}
          <Button title="Open chat" variant="secondary" onPress={() => navigation.navigate("Chat", { id: txId })} leftIcon={<Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />} />
          <Button title="Delivery proofs" variant="secondary" onPress={() => navigation.navigate("DeliveryProofs", { id: txId })} disabled={isSeller ? !canUploadProof : false} leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.text} />} />
          {!isSeller ? (
            <Button title="Pay / Verify" onPress={() => navigation.navigate("Payment", { id: txId })} disabled={!canPay} leftIcon={<Ionicons name="card-outline" size={18} color={colors.primaryText} />} />
          ) : null}
          <Button title="Receipt" variant="secondary" onPress={() => navigation.navigate("Receipt", { id: txId })} leftIcon={<Ionicons name="receipt-outline" size={18} color={colors.text} />} />
          {isSeller ? (
            <Button title="Report issue" variant="danger" onPress={() => navigation.navigate("ReportIssue", { id: txId, disputeId })} disabled={!canDispute} leftIcon={<Ionicons name="warning-outline" size={18} color={colors.primaryText} />} />
          ) : null}
          {!isSeller ? (
            <Button title="Confirm delivery" onPress={onConfirmDelivery} disabled={!canConfirmDelivery} loading={actionLoading && canConfirmDelivery} leftIcon={<Ionicons name="checkmark-done-outline" size={18} color={colors.primaryText} />} />
          ) : null}
          <Button title={disputeId ? "View dispute" : "Open dispute"} variant="danger" onPress={onOpenDispute} disabled={!canDispute} loading={actionLoading && canDispute && !disputeId} leftIcon={<Ionicons name="warning-outline" size={18} color={colors.primaryText} />} />
        </View>

        <SectionHeader title="Timeline" subtitle="Status updates and system events" />
        <View style={{ marginTop: spacing.sm }}>
          {eventsLoading ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <TransactionTimeline events={events} />
          )}
        </View>

        <SectionHeader title="Trust & security" subtitle="Signals that reinforce transaction safety" />
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Card style={{ padding: spacing.md }}>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>{isSeller ? "Verified payout profile" : "Verified seller"}</Text>
            <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{tx?.seller?.trustyTag ? "Passed" : "Pending"}</Text>
          </Card>
          <Card style={{ padding: spacing.md }}>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>Session verified</Text>
            <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{me ? "Passed" : "Pending"}</Text>
          </Card>
          <Card style={{ padding: spacing.md }}>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>Escrow protection</Text>
            <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{status !== "CREATED" && status !== "PENDING" ? "Active" : "Inactive"}</Text>
          </Card>
        </View>

        {isSeller ? (
          <>
            <SectionHeader title="Seller links" subtitle="Jump directly into the connected seller surfaces" />
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable onPress={() => navigation.navigate("DeliveryProofs", { id: txId })}>
                <Card style={{ padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>Proof center</Text>
                    <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Upload evidence, verify proof notes, and keep shipping records attached.</Text>
                  </View>
                  <Ionicons name="documents-outline" size={18} color={colors.primary} />
                </Card>
              </Pressable>
              <Pressable onPress={() => (disputeId ? navigation.navigate("DisputeDetail", { id: disputeId }) : navigation.navigate("ReportIssue", { id: txId }))}>
                <Card style={{ padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>{disputeId ? "Dispute center" : "Issue reporting"}</Text>
                    <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
                      {disputeId ? "Continue the active case with seller notes and supporting evidence." : "Open a protected case log if shipping or fulfillment breaks down."}
                    </Text>
                  </View>
                  <Ionicons name="warning-outline" size={18} color={colors.danger} />
                </Card>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
