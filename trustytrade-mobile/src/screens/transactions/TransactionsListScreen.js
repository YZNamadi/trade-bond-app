import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import { listTransactions } from "../../services/api";
import { useSessionStore } from "../../store/sessionStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

function dedupeById(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter((item, index) => {
    const key = String(item?.id || `row-${index}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

const BUYER_TABS = [
  { label: "All", match: () => true },
  { label: "Active", match: (s) => ["CREATED", "FUNDED", "SHIPPED", "DELIVERED"].includes(s) },
  { label: "Completed", match: (s) => ["RELEASE_PENDING", "RELEASED"].includes(s) },
  { label: "Issues", match: (s) => ["DISPUTED", "REFUND_PENDING", "REFUNDED"].includes(s) },
];

const SELLER_TABS = [
  { label: "All", match: () => true },
  { label: "Pending ship", match: (s) => ["FUNDED"].includes(s) },
  { label: "Shipped", match: (s) => ["SHIPPED", "DELIVERED"].includes(s) },
  { label: "Completed", match: (s) => ["RELEASE_PENDING", "RELEASED"].includes(s) },
];

export default function TransactionsListScreen({ navigation }) {
  const user = useSessionStore((s) => s.user);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const tabs = isSeller ? SELLER_TABS : BUYER_TABS;

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listTransactions();
      setRows(dedupeById(res));
    } catch (e) {
      setError(String(e?.response?.data?.message || e?.message || "Failed to load transactions"));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filteredRows = useMemo(() => {
    const current = tabs[tab] || tabs[0];
    return rows.filter((item) => current.match(String(item?.status || "").toUpperCase()));
  }, [rows, tab, tabs]);
  const sellerNeedsAction = useMemo(
    () => rows.filter((item) => ["FUNDED", "DISPUTED"].includes(String(item?.status || "").toUpperCase())).length,
    [rows],
  );
  const sellerReleased = useMemo(
    () => rows.filter((item) => String(item?.status || "").toUpperCase() === "RELEASED").length,
    [rows],
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}
        refreshControl={undefined}
      >
        <Text style={[typography.h2, { color: colors.text }]}>{isSeller ? "Orders" : "Transactions"}</Text>
        <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
          {isSeller ? "Incoming buyer-funded orders and shipping activity." : "All your escrow activity in one place."}
        </Text>

        {isSeller ? (
          <View style={{ marginTop: spacing.lg, flexDirection: "row", gap: spacing.sm }}>
            <Card style={{ flex: 1, alignItems: "center" }}>
              <Text style={[typography.caption, { color: colors.muted }]}>Needs action</Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xs }]}>{sellerNeedsAction}</Text>
            </Card>
            <Card style={{ flex: 1, alignItems: "center" }}>
              <Text style={[typography.caption, { color: colors.muted }]}>Released</Text>
              <Text style={[typography.h3, { color: colors.text, marginTop: spacing.xs }]}>{sellerReleased}</Text>
            </Card>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.lg }}>
          {!isSeller ? <Button title="Start escrow" onPress={() => navigation.navigate("CreateTransaction")} /> : null}
          {!!error && (
            <View style={{ marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: alpha(colors.warning, 0.3), backgroundColor: alpha(colors.warning, 0.1), padding: spacing.md }}>
              <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {tabs.map((item, index) => {
            const active = tab === index;
            return (
              <Pressable
                key={item.label}
                onPress={() => setTab(index)}
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
          {filteredRows.length === 0 ? (
            <Card style={{ borderStyle: "dashed", alignItems: "center", paddingVertical: spacing.xxl }}>
              <Text style={{ fontSize: 28 }}>📭</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.sm }]}>Nothing here yet</Text>
              <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs, textAlign: "center" }]}>
                {isSeller ? "New buyer-funded orders will appear here when escrow is opened." : "Transactions you start will appear here."}
              </Text>
            </Card>
          ) : filteredRows.map((item, index) => {
            const buyer = item?.buyer;
            const seller = item?.seller;
            const counterpart = isSeller ? buyer : seller;
            const label = counterpart?.trustyTag || counterpart?.fullName || counterpart?.email || (isSeller ? "Buyer" : "Seller");
            const title = item?.title || label || (isSeller ? "Order" : "Transaction");
            const initials = String(label || "TT")
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <Pressable key={`${String(item?.id || "tx")}-${index}`} onPress={() => navigation.navigate("TransactionDetail", { id: item?.id })}>
                <Card>
                  <View style={{ flexDirection: "row", gap: spacing.md }}>
                    <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                      <Text style={[typography.caption, { color: colors.primary }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                          <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]} numberOfLines={1}>
                            {isSeller ? `${label} · ` : `${label} · `}{timeAgo(item?.updatedAt)}
                          </Text>
                        </View>
                        <Text style={[typography.caption, { color: colors.text }]}>{formatMoney(item?.amount, item?.currency)}</Text>
                      </View>
                      <View style={{ marginTop: spacing.sm, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <StatusPill status={item?.status} />
                        <Text style={[typography.small, { color: colors.muted }]} numberOfLines={1}>
                          {isSeller ? "Buyer" : "Seller"}: {label}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onRefresh} style={{ marginTop: spacing.lg, alignSelf: "center" }}>
          <Text style={[typography.caption, { color: refreshing ? colors.muted : colors.primary }]}>
            {refreshing ? "Refreshing..." : "Refresh activity"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
