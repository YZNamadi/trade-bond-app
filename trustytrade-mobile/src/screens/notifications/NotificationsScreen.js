import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import { listDisputes, listTransactions } from "../../services/api";
import { getNotificationState, setNotificationState } from "../../services/storage";
import { useSessionStore } from "../../store/sessionStore";
import Card from "../../components/ui/Card";

function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export default function NotificationsScreen({ navigation }) {
  const user = useSessionStore((s) => s.user);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [readIds, setReadIds] = useState([]);
  const notificationScope = useMemo(() => `${user?.id || "guest"}:${user?.role || "user"}`, [user?.id, user?.role]);

  const persistReadIds = useCallback(
    async (nextIds) => {
      setReadIds(nextIds);
      await setNotificationState(notificationScope, { readIds: nextIds });
    },
    [notificationScope],
  );

  const load = useCallback(async () => {
    const rootNav = navigation.getParent?.() || navigation;
    const saved = await getNotificationState(notificationScope);
    const [txs, disputes] = await Promise.allSettled([listTransactions(), listDisputes()]);
    const transactions = txs.status === "fulfilled" && Array.isArray(txs.value) ? txs.value : [];
    const disputeRows = disputes.status === "fulfilled" && Array.isArray(disputes.value) ? disputes.value : [];
    const savedReadIds = Array.isArray(saved?.readIds) ? saved.readIds.map((item) => String(item)) : [];

    const txItems = transactions.slice(0, 8).map((item) => {
      const status = String(item?.status || "").toUpperCase();
      const sellerAction =
        status === "FUNDED"
          ? {
              title: "Order funded",
              body: "Escrow is funded. Mark this order as shipped once you hand it over for delivery.",
              target: () => rootNav.navigate("Transactions", { screen: "UpdateShipping", params: { id: item?.id } }),
            }
          : status === "SHIPPED"
            ? {
                title: "Shipping live",
                body: item?.trackingId ? `Tracking ${String(item.trackingId)} is active. Add proof if you need stronger delivery evidence.` : "Shipping is active. Keep delivery evidence attached to the order.",
                target: () => rootNav.navigate("Transactions", { screen: "DeliveryProofs", params: { id: item?.id } }),
              }
            : status === "RELEASE_PENDING" || status === "RELEASED"
              ? {
                  title: status === "RELEASED" ? "Payout released" : "Payout processing",
                  body: status === "RELEASED" ? "Escrow release completed. Review the payout in earnings." : "The provider is processing payout for this order.",
                  target: () => rootNav.navigate("Earnings"),
                }
              : {
                  title: `Order ${status || "updated"}`,
                  body: item?.description || "A buyer order has a new status update.",
                  target: () => rootNav.navigate("Transactions", { screen: "TransactionDetail", params: { id: item?.id } }),
                };

      return {
      id: `tx-${item.id}`,
      type: "transaction",
      title: isSeller ? sellerAction.title : `Transaction ${status || "updated"}`,
      body: isSeller
        ? sellerAction.body
        : item?.description || "Your escrow transaction has a new update.",
      createdAt: item?.updatedAt || item?.createdAt,
      unread: !savedReadIds.includes(`tx-${item.id}`) && ["CREATED", "FUNDED", "SHIPPED", "DELIVERED", "DISPUTED", "RELEASE_PENDING", "RELEASED"].includes(status),
      target: isSeller ? sellerAction.target : () => rootNav.navigate("Transactions", { screen: "TransactionDetail", params: { id: item?.id } }),
      cta: isSeller
        ? status === "FUNDED"
          ? "Mark shipped"
          : status === "SHIPPED"
            ? "Open proofs"
            : status === "RELEASE_PENDING" || status === "RELEASED"
              ? "View earnings"
              : "Open order"
        : "Open",
    };
    });

    const disputeItems = disputeRows.slice(0, 4).map((item) => ({
      id: `dispute-${item.id}`,
      type: "dispute",
      title: `Dispute ${String(item?.status || "").toUpperCase() || "updated"}`,
      body: item?.transactionId
        ? `${isSeller ? "Order" : "Transaction"} ${String(item.transactionId).slice(0, 8)}... requires attention.`
        : "A dispute has been updated.",
      createdAt: item?.updatedAt || item?.createdAt,
      unread: !savedReadIds.includes(`dispute-${item.id}`),
      target: () => rootNav.navigate("Notifications", { screen: "DisputeDetail", params: { id: item?.id } }),
      cta: "Open dispute",
    }));

    const merged = [...disputeItems, ...txItems]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 12);
    setReadIds(savedReadIds);
    setItems(merged);
  }, [isSeller, navigation, notificationScope]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const visibleItems = useMemo(() => {
    if (filter === "unread") return items.filter((item) => item.unread);
    if (filter === "orders") return items.filter((item) => item.type === "transaction");
    if (filter === "disputes") return items.filter((item) => item.type === "dispute");
    return items;
  }, [filter, items]);

  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);

  const markItemRead = useCallback(
    async (id) => {
      const key = String(id);
      if (readIds.includes(key)) return;
      const nextIds = [...readIds, key];
      await persistReadIds(nextIds);
      setItems((current) => current.map((item) => (String(item.id) === key ? { ...item, unread: false } : item)));
    },
    [persistReadIds, readIds],
  );

  const onMarkAllRead = useCallback(async () => {
    const nextIds = Array.from(new Set([...readIds, ...items.map((item) => String(item.id))]));
    await persistReadIds(nextIds);
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
  }, [items, persistReadIds, readIds]);

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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h2, { color: colors.text }]}>Notifications</Text>
            <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
              {isSeller ? "Order, shipping, payout, and dispute updates that need seller attention." : "Transaction and dispute updates that need your attention."}
            </Text>
          </View>
          <Pressable onPress={onMarkAllRead}>
            <Text style={[typography.caption, { color: unreadCount > 0 ? colors.primary : colors.muted }]}>
              {unreadCount > 0 ? "Mark all read" : "All read"}
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.md, flexDirection: "row", gap: spacing.sm }}>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text style={[typography.caption, { color: colors.muted }]}>Unread</Text>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xs }]}>{unreadCount}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text style={[typography.caption, { color: colors.muted }]}>{isSeller ? "Order alerts" : "Updates"}</Text>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xs }]}>{items.filter((item) => item.type === "transaction").length}</Text>
          </Card>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {[
            { key: "all", label: "All" },
            { key: "unread", label: "Unread" },
            { key: "orders", label: isSeller ? "Orders" : "Transactions" },
            { key: "disputes", label: "Disputes" },
          ].map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={{
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: active ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={[typography.caption, { color: active ? colors.primaryText : colors.mutedSoft }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          {visibleItems.length === 0 ? (
            <Card style={{ borderStyle: "dashed", alignItems: "center", paddingVertical: spacing.xxxl }}>
              <Ionicons name="notifications-outline" size={28} color={colors.muted} />
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.sm }]}>No notifications yet</Text>
            </Card>
          ) : visibleItems.map((item) => (
            <Pressable key={item.id} onPress={async () => {
              await markItemRead(item.id);
              item.target();
            }}>
              <Card style={{ backgroundColor: item.unread ? alpha(colors.primary, 0.08) : colors.surface, borderColor: item.unread ? alpha(colors.primary, 0.25) : colors.border }}>
                <View style={{ flexDirection: "row", gap: spacing.md }}>
                  <View style={{ paddingTop: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.unread ? colors.primary : alpha("#FFFFFF", 0.22) }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                      <Text style={[typography.bodyStrong, { color: colors.text, flex: 1 }]}>{item.title}</Text>
                      <Text style={[typography.caption, { color: colors.muted }]}>{timeAgo(item.createdAt)}</Text>
                    </View>
                    <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{item.body}</Text>
                    {!!item.cta ? (
                      <Text style={[typography.caption, { color: colors.primary, marginTop: spacing.sm }]}>
                        {item.cta}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
