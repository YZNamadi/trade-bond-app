import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { useSessionStore } from "../../store/sessionStore";
import { getMe, listTransactions } from "../../services/api";
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

function formatMoney(amount, currency = "NGN") {
  const num = Number(amount || 0);
  const safe = Number.isFinite(num) ? num : 0;
  const major = safe.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = String(currency).toUpperCase() === "NGN" ? "₦" : "";
  return `${symbol}${major}`;
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

function normalizeStatus(status) {
  return String(status || "").toUpperCase();
}

function partnerLabel(item, isSeller) {
  const counterpart = isSeller ? item?.buyer : item?.seller;
  return counterpart?.trustyTag || counterpart?.fullName || counterpart?.email || (isSeller ? "Buyer" : "Seller");
}

function StatusPill({ status }) {
  const s = normalizeStatus(status);
  const tone =
    s === "RELEASED" || s === "REFUNDED"
      ? colors.success
      : s === "DISPUTED"
        ? colors.danger
        : s === "RELEASE_PENDING" || s === "REFUND_PENDING"
          ? colors.warning
          : colors.primary;
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: alpha("#FFFFFF", 0.06), borderWidth: 1, borderColor: colors.border }}>
      <Text style={[typography.caption, { color: tone }]}>{s || "ACTIVE"}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const user = useSessionStore((s) => s.user);
  const setSession = useSessionStore((s) => s.setSession);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, txs] = await Promise.all([getMe(), listTransactions()]);
      await setSession({ user: me });
      setRows(dedupeById(txs));
    } catch (e) {
      setError(String(e?.message || "Failed to load profile"));
    } finally {
      setLoading(false);
    }
  }, [setSession]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const active = useMemo(
    () =>
      rows.filter((item) =>
        isSeller
          ? ["FUNDED", "SHIPPED", "DELIVERED"].includes(normalizeStatus(item?.status))
          : ["CREATED", "FUNDED", "SHIPPED", "DELIVERED"].includes(normalizeStatus(item?.status)),
      ),
    [isSeller, rows],
  );
  const recent = useMemo(() => rows.slice(0, 4), [rows]);
  const escrowTotal = useMemo(() => {
    return active.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
  }, [active]);
  const releasedTotal = useMemo(
    () => rows.filter((item) => normalizeStatus(item?.status) === "RELEASED").reduce((sum, row) => sum + Number(row?.amount || 0), 0),
    [rows],
  );
  const pendingShip = useMemo(() => rows.filter((item) => normalizeStatus(item?.status) === "FUNDED").length, [rows]);
  const inTransit = useMemo(() => rows.filter((item) => normalizeStatus(item?.status) === "SHIPPED").length, [rows]);
  const heroAmount = isSeller ? releasedTotal : escrowTotal;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={[typography.small, { color: colors.muted }]}>{isSeller ? "Seller dashboard" : "Welcome back"}</Text>
            <Text style={[typography.h2, { color: colors.text }]} numberOfLines={1}>
              {user?.fullName || "Guest"}{" "}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Notifications")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View
          style={[
            {
              marginTop: spacing.xl,
              borderRadius: radius.xl,
              backgroundColor: colors.primary,
              padding: spacing.lg,
              overflow: "hidden",
            },
            shadows.glow,
          ]}
        >
          <View style={{ position: "absolute", right: -24, top: -24, width: 140, height: 140, borderRadius: 70, backgroundColor: alpha("#FFFFFF", 0.12) }} />
          <View style={{ position: "absolute", left: -36, bottom: -56, width: 160, height: 160, borderRadius: 80, backgroundColor: alpha("#FFFFFF", 0.08) }} />
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="shield-checkmark-outline" size={14} color={alpha("#FFFFFF", 0.85)} />
                <Text style={[typography.caption, { color: alpha("#FFFFFF", 0.82) }]}>{isSeller ? "Released by provider" : "Escrow status"}</Text>
              </View>
              <Text style={[typography.h1, { color: "#FFFFFF", marginTop: spacing.xs }]}>{formatMoney(heroAmount)}</Text>
            </View>
            <View style={{ borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.16), paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}>
              <Text style={[typography.caption, { color: "#FFFFFF" }]}>{isSeller ? "Paystack" : "Anchor"}</Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: alpha("#FFFFFF", 0.16), paddingTop: spacing.md, flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={[typography.small, { color: alpha("#FFFFFF", 0.72) }]}>{isSeller ? "Released total" : "Funds protected"}</Text>
              <Text style={[typography.bodyStrong, { color: "#FFFFFF", marginTop: 2 }]}>{formatMoney(heroAmount)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[typography.small, { color: alpha("#FFFFFF", 0.72) }]}>{isSeller ? "Active orders" : "Active"}</Text>
              <Text style={[typography.bodyStrong, { color: "#FFFFFF", marginTop: 2 }]}>{active.length}</Text>
            </View>
          </View>
        </View>

        {!isSeller ? (
          <Pressable onPress={() => navigation.navigate("Transactions", { screen: "CreateTransaction" })} style={{ marginTop: spacing.md }}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="add" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>Start a transaction</Text>
                <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>Pay a seller through escrow</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.muted} />
            </Card>
          </Pressable>
        ) : null}

        <View style={{ marginTop: spacing.md, flexDirection: "row", gap: spacing.sm }}>
          {isSeller ? (
            <>
              <Pressable onPress={() => navigation.navigate("Transactions")} style={{ flex: 1 }}>
                <Card style={{ alignItems: "center" }}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.text, marginTop: spacing.xs }]}>Pending ship</Text>
                  <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>{pendingShip}</Text>
                </Card>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("Settings", { screen: "SellerVerification" })} style={{ flex: 1 }}>
                <Card style={{ alignItems: "center" }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.text, marginTop: spacing.xs }]}>Verification</Text>
                  <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>{user?.verified || user?.isVerified ? "Active" : "Pending"}</Text>
                </Card>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => navigation.navigate("Search")} style={{ flex: 1 }}>
              <Card style={{ alignItems: "center" }}>
                <Ionicons name="search-outline" size={18} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.text, marginTop: spacing.xs }]}>Find seller</Text>
              </Card>
            </Pressable>
          )}
          {!isSeller ? (
            <Pressable onPress={refresh} style={{ flex: 1 }}>
              <Card style={{ alignItems: "center" }}>
                {loading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="refresh-outline" size={18} color={colors.primary} />}
                <Text style={[typography.caption, { color: colors.text, marginTop: spacing.xs }]}>Refresh</Text>
              </Card>
            </Pressable>
          ) : null}
        </View>

        {isSeller ? (
          <Pressable onPress={() => navigation.navigate("Transactions")} style={{ marginTop: spacing.sm }}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="car-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>In transit</Text>
                <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>{inTransit} orders currently shipping to buyers</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.muted} />
            </Card>
          </Pressable>
        ) : null}

        {!!error ? (
          <View style={{ marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: alpha(colors.warning, 0.3), backgroundColor: alpha(colors.warning, 0.1), padding: spacing.md }}>
            <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
          </View>
        ) : null}

        {active.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>{isSeller ? "Active orders" : "Active"}</Text>
              <Text style={[typography.caption, { color: colors.muted }]}>{active.length}</Text>
            </View>
            <View style={{ gap: spacing.sm }}>
              {active.slice(0, 2).map((item, index) => {
                const seller = item?.seller || {};
                return (
                  <Pressable key={`${String(item?.id || "active")}-${index}`} onPress={() => navigation.navigate("Transactions", { screen: "TransactionDetail", params: { id: item?.id } })}>
                    <Card>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                            {item?.title || partnerLabel(item, isSeller) || (isSeller ? "Seller order" : "Escrow transaction")}
                          </Text>
                          <Text style={[typography.small, { color: colors.muted, marginTop: 4 }]} numberOfLines={1}>
                            {isSeller ? "From" : "with"} {partnerLabel(item, isSeller)}
                          </Text>
                        </View>
                        <StatusPill status={item?.status} />
                      </View>
                      <View style={{ marginTop: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <Text style={[typography.h3, { color: colors.text }]}>{formatMoney(item?.amount, item?.currency)}</Text>
                        <Text style={[typography.small, { color: colors.muted }]}>{timeAgo(item?.updatedAt)}</Text>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
            <Text style={[typography.eyebrow, { color: colors.muted }]}>{isSeller ? "Recent orders" : "Recent activity"}</Text>
            <Pressable onPress={() => navigation.navigate("Transactions")}>
              <Text style={[typography.caption, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <Card style={{ borderStyle: "dashed", alignItems: "center" }}>
              <Text style={{ fontSize: 28 }}>📭</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.sm }]}>Nothing here yet</Text>
              <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs, textAlign: "center" }]}>
                {isSeller ? "Incoming orders will appear here after buyers fund escrow." : "Transactions you start will appear here."}
              </Text>
            </Card>
          ) : (
            <Card padded={false} style={{ overflow: "hidden" }}>
              {recent.map((item, index) => {
                const label = partnerLabel(item, isSeller);
                const initials = String(label || "TT")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <Pressable
                    key={`${String(item?.id || "recent")}-${index}`}
                    onPress={() => navigation.navigate("Transactions", { screen: "TransactionDetail", params: { id: item?.id } })}
                    style={{
                      padding: spacing.lg,
                      borderBottomWidth: index === recent.length - 1 ? 0 : 1,
                      borderBottomColor: colors.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.md,
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                      <Text style={[typography.caption, { color: colors.primary }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                        {item?.title || label || (isSeller ? "Seller order" : "Escrow transaction")}
                      </Text>
                      <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>
                        {isSeller ? `From ${label} · ` : ""}{timeAgo(item?.updatedAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[typography.caption, { color: colors.text }]}>{formatMoney(item?.amount, item?.currency)}</Text>
                      <View style={{ marginTop: 4 }}>
                        <StatusPill status={item?.status} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
