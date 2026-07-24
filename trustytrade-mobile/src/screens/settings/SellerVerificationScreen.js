import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { useSessionStore } from "../../store/sessionStore";
import Card from "../../components/ui/Card";

function Item({ icon, label, status, tone = colors.text }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>{label}</Text>
      </View>
      <Text style={[typography.caption, { color: tone }]}>{status}</Text>
    </View>
  );
}

export default function SellerVerificationScreen() {
  const user = useSessionStore((s) => s.user);
  const verified = Boolean(user?.verified || user?.isVerified);
  const reviewedAt = user?.updatedAt || user?.createdAt || null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}>
        <Text style={[typography.small, { color: colors.muted }]}>Settings</Text>
        <Text style={[typography.h2, { color: colors.text }]}>Verification</Text>
        <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
          Seller access is activated after onboarding, payout details, and TrustyTag review are approved.
        </Text>

        <View
          style={[
            {
              marginTop: spacing.lg,
              borderRadius: radius.xl,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: verified ? alpha(colors.success, 0.35) : alpha(colors.warning, 0.35),
              padding: spacing.lg,
              overflow: "hidden",
            },
            shadows.soft,
          ]}
        >
          <View style={{ position: "absolute", right: -24, top: -24, width: 120, height: 120, borderRadius: 60, backgroundColor: alpha(colors.primary, 0.12) }} />
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: verified ? alpha(colors.success, 0.16) : alpha(colors.warning, 0.16), alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="badge-checkmark-outline" size={22} color={verified ? colors.success : colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>{verified ? "Verified seller" : "Verification pending"}</Text>
              <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
                {verified
                  ? "Your seller profile is active and your TrustyTag can receive buyer-funded escrow orders."
                  : "Only verified sellers can fully receive transactions. TrustyTag activation completes after review."}
              </Text>
            </View>
          </View>
        </View>

        <Card elevated style={{ marginTop: spacing.md }}>
          <Text style={[typography.eyebrow, { color: colors.muted }]}>Current checks</Text>
          <View style={{ marginTop: spacing.sm }}>
            <Item icon="storefront-outline" label="Seller onboarding review" status={verified ? "Approved" : "Pending"} tone={verified ? colors.success : colors.warning} />
            <Item icon="card-outline" label="Submitted bank details" status={verified ? "Checked" : "Required"} tone={verified ? colors.success : colors.warning} />
            <Item icon="mail-outline" label="Account email" status="Active" tone={colors.success} />
            <Item icon="at-outline" label="TrustyTag activation" status={verified ? "Active" : "Pending"} tone={verified ? colors.success : colors.warning} />
          </View>
        </Card>

        <Card elevated style={{ marginTop: spacing.md }}>
          <Text style={[typography.eyebrow, { color: colors.muted }]}>Verification path</Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={[typography.caption, { color: colors.primary }]}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>Onboarding submitted</Text>
                <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Seller identity and payout details enter manual review.</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: verified ? alpha(colors.success, 0.16) : alpha(colors.warning, 0.16), alignItems: "center", justifyContent: "center" }}>
                <Text style={[typography.caption, { color: verified ? colors.success : colors.warning }]}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>Compliance review</Text>
                <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
                  {verified ? "Review completed and seller permissions are active." : "Waiting for review approval before your seller shell is fully unlocked."}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: verified ? alpha(colors.success, 0.16) : alpha("#FFFFFF", 0.08), alignItems: "center", justifyContent: "center" }}>
                <Text style={[typography.caption, { color: verified ? colors.success : colors.muted }]}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>TrustyTag live</Text>
                <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Buyers can validate your seller identity and complete escrow orders with confidence.</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card elevated style={{ marginTop: spacing.md }}>
          <Text style={[typography.eyebrow, { color: colors.muted }]}>Review metadata</Text>
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
              <Text style={[typography.small, { color: colors.muted }]}>Current status</Text>
              <Text style={[typography.small, { color: verified ? colors.success : colors.warning }]}>{verified ? "Approved" : "Pending review"}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
              <Text style={[typography.small, { color: colors.muted }]}>Last profile update</Text>
              <Text style={[typography.small, { color: colors.text }]}>{reviewedAt ? new Date(reviewedAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" }) : "Unavailable"}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
