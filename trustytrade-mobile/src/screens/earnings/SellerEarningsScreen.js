import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { listTransactions } from "../../services/api";
import Card from "../../components/ui/Card";

function formatMoney(amount) {
  const num = Number(amount || 0);
  const safe = Number.isFinite(num) ? num : 0;
  return `₦${safe.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export default function SellerEarningsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await listTransactions();
      setRows(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(String(e?.response?.data?.message || e?.message || "Failed to load earnings"));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const allCompleted = useMemo(() => rows.filter((item) => String(item?.status || "").toUpperCase() === "RELEASED"), [rows]);

  const totalEarned = useMemo(() => allCompleted.reduce((sum, item) => sum + Number(item?.amount || 0), 0), [allCompleted]);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const current = new Date(now - (6 - idx) * dayMs);
      current.setHours(0, 0, 0, 0);
      const start = current.getTime();
      const end = start + dayMs;
      const amount = allCompleted.reduce((sum, item) => {
        const ts = new Date(item?.updatedAt || item?.createdAt || 0).getTime();
        if (!Number.isFinite(ts)) return sum;
        return ts >= start && ts < end ? sum + Number(item?.amount || 0) : sum;
      }, 0);
      return {
        label: current.toLocaleDateString("en-NG", { weekday: "short" }),
        amount,
        key: dayKey(start),
      };
    });
  }, [allCompleted, now]);

  const maxDay = Math.max(0, ...last7.map((item) => item.amount));
  const total7 = last7.reduce((sum, item) => sum + item.amount, 0);
  const prev7 = useMemo(() => {
    const start = now - 14 * dayMs;
    const end = now - 7 * dayMs;
    return allCompleted.reduce((sum, item) => {
      const ts = new Date(item?.updatedAt || item?.createdAt || 0).getTime();
      if (!Number.isFinite(ts)) return sum;
      return ts >= start && ts < end ? sum + Number(item?.amount || 0) : sum;
    }, 0);
  }, [allCompleted, now]);
  const pct = prev7 > 0 ? ((total7 - prev7) / prev7) * 100 : total7 > 0 ? 100 : 0;

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
        <Text style={[typography.small, { color: colors.muted }]}>Seller finance</Text>
        <Text style={[typography.h2, { color: colors.text }]}>Earnings</Text>
        <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
          Released payouts, recent earnings momentum, and completed order revenue.
        </Text>

        {!!error ? (
          <Card style={{ marginTop: spacing.md, backgroundColor: alpha(colors.danger, 0.12), borderColor: alpha(colors.danger, 0.35), padding: spacing.md }}>
            <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
          </Card>
        ) : null}

        <View
          style={[
            {
              marginTop: spacing.lg,
              borderRadius: radius.xl,
              backgroundColor: colors.primary,
              padding: spacing.lg,
              overflow: "hidden",
            },
            shadows.glow,
          ]}
        >
          <View style={{ position: "absolute", right: -18, top: -26, width: 126, height: 126, borderRadius: 63, backgroundColor: alpha("#FFFFFF", 0.14) }} />
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Ionicons name="trending-up-outline" size={14} color={alpha("#FFFFFF", 0.82)} />
                <Text style={[typography.caption, { color: alpha("#FFFFFF", 0.82) }]}>Total earnings</Text>
              </View>
              <Text style={[typography.h1, { color: "#FFFFFF", marginTop: spacing.xs }]}>{formatMoney(totalEarned)}</Text>
              <Text style={[typography.small, { color: alpha("#FFFFFF", 0.8), marginTop: spacing.xs }]}>
                {allCompleted.length} completed transactions
              </Text>
            </View>
            <View style={{ borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.18), paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
              <Text style={[typography.caption, { color: "#FFFFFF" }]}>Released</Text>
            </View>
          </View>
        </View>

        <Card elevated style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[typography.eyebrow, { color: colors.muted }]}>Last 7 days</Text>
            <Text style={[typography.caption, { color: pct >= 0 ? colors.success : colors.danger }]}>
              {`${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
            </Text>
          </View>
          <View style={{ marginTop: spacing.md, height: 110, flexDirection: "row", alignItems: "flex-end", gap: spacing.xs }}>
            {last7.map((item) => {
              const height = maxDay > 0 ? Math.max(8, Math.round((item.amount / maxDay) * 100)) : 4;
              return (
                <View key={item.key} style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ width: "100%", height: `${height}%`, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm, backgroundColor: item.amount > 0 ? colors.primary : alpha("#FFFFFF", 0.12) }} />
                  <Text style={[typography.caption, { color: colors.muted, marginTop: spacing.xs }]}>{item.label.slice(0, 1)}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ marginTop: spacing.sm, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={[typography.small, { color: colors.muted }]}>Rolling total</Text>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>{formatMoney(total7)}</Text>
          </View>
        </Card>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <Text style={[typography.eyebrow, { color: colors.muted }]}>Completed transactions</Text>
          {allCompleted.length === 0 ? (
            <Card style={{ borderStyle: "dashed", alignItems: "center", paddingVertical: spacing.xxl }}>
              <Text style={{ fontSize: 28 }}>💸</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.sm }]}>No released payouts yet</Text>
              <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs, textAlign: "center" }]}>
                Completed orders will appear here once escrow has been released to your payout account.
              </Text>
            </Card>
          ) : (
            allCompleted.map((item) => (
              <Card key={String(item?.id)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: alpha(colors.success, 0.16), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="checkmark-done-outline" size={20} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                    {item?.title || item?.buyer?.fullName || "Completed order"}
                  </Text>
                  <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]} numberOfLines={1}>
                    {item?.buyer?.fullName || "Buyer"} · {new Date(item?.updatedAt || item?.createdAt || Date.now()).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <Text style={[typography.bodyStrong, { color: colors.success }]}>{formatMoney(item?.amount)}</Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
