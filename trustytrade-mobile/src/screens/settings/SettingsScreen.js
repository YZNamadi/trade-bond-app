import React from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import { useSessionStore } from "../../store/sessionStore";
import Card from "../../components/ui/Card";

function Row({ title, subtitle, onPress, danger, icon }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: danger ? alpha(colors.danger, 0.12) : colors.accent, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyStrong, { color: danger ? colors.danger : colors.text }]}>{title}</Text>
          {!!subtitle && <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

export default function SettingsScreen({ navigation }) {
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";
  const isVerified = Boolean(user?.verified || user?.isVerified);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md }}>
        <Text style={[typography.h2, { color: colors.text }]}>Settings</Text>
        <Text style={[typography.body, { color: colors.mutedSoft }]}>
          {isSeller ? "Seller verification, payouts, disputes, and account security." : "Profile, banking, disputes, and account security."}
        </Text>

        <Card style={{ padding: spacing.lg }}>
          <Text style={[typography.bodyStrong, { color: colors.text }]}>{user?.fullName || "Account"}</Text>
          <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{user?.email || "—"}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" }}>
            <View style={{ alignSelf: "flex-start", borderRadius: radius.full, backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
              <Text style={[typography.caption, { color: colors.primary }]}>Role: {user?.role || "—"}</Text>
            </View>
            {isSeller ? (
              <View style={{ alignSelf: "flex-start", borderRadius: radius.full, backgroundColor: alpha(isVerified ? colors.success : colors.warning, 0.16), paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                <Text style={[typography.caption, { color: isVerified ? colors.success : colors.warning }]}>
                  {isVerified ? "Verified seller" : "Verification pending"}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        <Row title="Profile" subtitle="Update your name and phone" icon="person-outline" onPress={() => navigation.navigate("Profile")} />
        <Row title="Bank account" subtitle="Link or review your payout details" icon="card-outline" onPress={() => navigation.navigate("BankAccount")} />
        {isSeller ? (
          <>
            <Row
              title="Seller verification"
              subtitle={isVerified ? "Review current seller approval status" : "Track onboarding and approval checks"}
              icon="shield-checkmark-outline"
              onPress={() => navigation.navigate("SellerVerification")}
            />
          </>
        ) : (
          <Row title="Become a seller" subtitle="Submit a seller onboarding request" icon="storefront-outline" onPress={() => navigation.navigate("SellerApply")} />
        )}
        <Row title="Disputes" subtitle="View dispute history" icon="warning-outline" onPress={() => navigation.navigate("Disputes")} />

        <Row title="Sign out" danger subtitle="Log out of this device" icon="log-out-outline" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}
