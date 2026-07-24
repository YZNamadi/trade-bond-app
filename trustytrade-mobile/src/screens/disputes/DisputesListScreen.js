import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import { listDisputes } from "../../services/api";
import { useSessionStore } from "../../store/sessionStore";
import Card from "../../components/ui/Card";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function DisputesListScreen({ navigation }) {
  const user = useSessionStore((s) => s.user);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await listDisputes();
    setRows(Array.isArray(res) ? res : []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        setError(normalizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item?.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshing={false}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.h2, { color: colors.text }]}>Disputes</Text>
            <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
              {isSeller ? "Seller-side issue cases freeze payout until review is complete." : "Open cases freeze escrow until review is complete."}
            </Text>
            {!!error ? (
              <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.12), borderWidth: 1, borderColor: alpha(colors.danger, 0.3), padding: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const title = String(item?.status || "Dispute").toUpperCase();
          const subtitle = item?.transactionId ? `Transaction: ${item.transactionId}` : "";
          return (
            <Pressable
              onPress={() => navigation.navigate("DisputeDetail", { id: item?.id })}
              style={{ marginBottom: spacing.md }}
            >
              <Card style={{ backgroundColor: alpha(colors.danger, 0.05), borderColor: alpha(colors.danger, 0.2) }}>
                <View style={{ flexDirection: "row", gap: spacing.md }}>
                  <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.14), alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="warning-outline" size={20} color={colors.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>{title}</Text>
                    {!!subtitle && <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{subtitle}</Text>}
                    <Text style={[typography.caption, { color: colors.muted, marginTop: spacing.xs }]}>
                      {isSeller ? "Review buyer notes, upload evidence, and keep shipping context attached to the case." : "Review the case timeline and add supporting notes or evidence."}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Card style={{ borderStyle: "dashed" }}>
            <Text style={[typography.h3, { color: colors.text }]}>No disputes</Text>
            <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>
              {isSeller ? "If an order has a problem, report it from the order screen to open a protected case log." : "If a transaction has an issue, you can open a dispute from the transaction screen."}
            </Text>
          </Card>
        }
      />
    </SafeAreaView>
  );
}
