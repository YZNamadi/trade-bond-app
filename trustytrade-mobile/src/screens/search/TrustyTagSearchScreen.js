import React, { useMemo, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import { getSellerByTrustyTag } from "../../services/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

function normalizeTrustyTag(value) {
  const raw = String(value || "").trim().replace(/\s+/g, "");
  if (!raw) return "";
  const clean = raw.replace(/^@+/, "");
  return clean ? `@${clean}` : "";
}

function initialsFromSeller(seller) {
  const source = String(seller?.fullName || seller?.trustyTag || seller?.username || "TT").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  return source.replace(/^@/, "").slice(0, 2).toUpperCase();
}

function formatMemberSince(date) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Recently joined";
  return value.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function lookupErrorCopy(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("404") || text.includes("not found")) {
    return "No seller matched that TrustyTag. Check the spelling or ask the seller to resend the exact handle.";
  }
  return "We could not complete the secure lookup right now. Please try again in a moment.";
}

export default function TrustyTagSearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState(null);
  const [didSearch, setDidSearch] = useState(false);

  const normalizedQuery = useMemo(() => normalizeTrustyTag(query), [query]);
  const canSearch = useMemo(() => !loading && String(normalizedQuery).replace(/^@/, "").length >= 2, [loading, normalizedQuery]);

  const onSearch = async () => {
    if (!canSearch) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setSeller(null);
    setDidSearch(true);
    try {
      const res = await getSellerByTrustyTag(normalizedQuery);
      if (!res) {
        setError("NOT_FOUND");
        return;
      }
      setSeller(res);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const onEditLookup = () => {
    setSeller(null);
    setError(null);
    setDidSearch(false);
  };

  const onStartEscrow = () => {
    if (!seller?.id) return;
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate("Transactions", {
        screen: "CreateTransaction",
        params: { seller, sellerId: seller.id, trustyTag: seller.trustyTag || normalizedQuery, createdAt: Date.now() },
      });
      return;
    }
    navigation.navigate("CreateFromSearch", { seller, sellerId: seller.id, trustyTag: seller.trustyTag || normalizedQuery, createdAt: Date.now() });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl }}
        >
          <Text style={[typography.h2, { color: colors.text }]}>TrustyTag Lookup</Text>
          <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
            Verify the seller before funds move. Search a TrustyTag to confirm you are starting escrow with the right counterparty.
          </Text>

          <Card elevated style={{ marginTop: spacing.xl, padding: spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
              <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>Secure seller validation</Text>
                <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>
                  Confirm the TrustyTag before creating a protected trade.
                </Text>
              </View>
            </View>

            <Input
              label="TrustyTag"
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                if (seller || error) {
                  setSeller(null);
                  setError(null);
                }
              }}
              autoCapitalize="none"
              placeholder="@sellerhandle"
              style={{ marginTop: 0 }}
              icon={<Ionicons name="search-outline" size={18} color={colors.muted} />}
            />

            <Text style={[typography.small, { color: colors.muted, marginTop: spacing.sm }]}>
              Paste or type the seller’s handle. We will normalize it and verify it against active seller records.
            </Text>

            <Button
              title="Verify seller"
              onPress={onSearch}
              disabled={!canSearch}
              loading={loading}
              style={{ marginTop: spacing.lg }}
              leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryText} />}
            />

            {!!normalizedQuery ? (
              <Text style={[typography.caption, { color: colors.muted, marginTop: spacing.md }]}>
                Secure lookup target: {normalizedQuery}
              </Text>
            ) : null}
          </Card>

          {loading ? (
            <Card style={{ marginTop: spacing.lg, padding: spacing.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: alpha(colors.primary, 0.14), alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>Verifying seller identity</Text>
                  <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>
                    Checking this TrustyTag against verified seller records before you begin escrow.
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <LoadingBar width="86%" />
                <LoadingBar width="63%" />
                <LoadingBar width="72%" />
              </View>
            </Card>
          ) : null}

          {!seller && !loading && !didSearch ? (
            <Card style={{ marginTop: spacing.lg, padding: spacing.lg }}>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>Why this matters</Text>
                  <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>
                    TrustyTag lookup helps you confirm the seller identity before money enters escrow. Use the exact handle shared by the seller.
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <TrustBullet icon="shield-checkmark-outline" text="Confirms the seller account before you start a protected trade" />
                <TrustBullet icon="swap-horizontal-outline" text="Keeps payments inside escrow until transaction conditions are met" />
                <TrustBullet icon="chatbubble-ellipses-outline" text="Keeps messages, proofs, and disputes inside the platform record" />
              </View>
            </Card>
          ) : null}

          {!!error && !loading ? (
            <Card style={{ marginTop: spacing.lg, padding: spacing.lg }}>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    backgroundColor: alpha(error === "NOT_FOUND" ? colors.warning : colors.danger, 0.14),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={error === "NOT_FOUND" ? "search-outline" : "alert-circle-outline"} size={20} color={error === "NOT_FOUND" ? colors.warning : colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>
                    {error === "NOT_FOUND" ? "No verified seller found" : "Lookup unavailable"}
                  </Text>
                  <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>
                    {error === "NOT_FOUND" ? lookupErrorCopy("not found") : lookupErrorCopy(error)}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <TrustBullet
                  icon="checkmark-circle-outline"
                  text={error === "NOT_FOUND" ? "Try the exact TrustyTag shared by the seller" : "Your search has not changed any transaction state"}
                />
                <TrustBullet
                  icon="shield-outline"
                  text="Only verified seller accounts can pass this secure lookup"
                />
              </View>
            </Card>
          ) : null}

          {!!seller ? (
            <>
              <Card elevated style={{ marginTop: spacing.lg, padding: spacing.lg }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: radius.lg,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: colors.primaryGlow || colors.primary,
                      shadowOpacity: 0.28,
                      shadowRadius: 14,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    }}
                  >
                    <Text style={[typography.bodyStrong, { color: colors.primaryText }]}>
                      {initialsFromSeller(seller)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
                      <Text style={[typography.h3, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
                        {seller?.fullName || seller?.trustyTag || "Verified seller"}
                      </Text>
                      <View
                        style={{
                          borderRadius: radius.full,
                          backgroundColor: alpha(colors.success, 0.16),
                          borderWidth: 1,
                          borderColor: alpha(colors.success, 0.34),
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={[typography.caption, { color: colors.success }]}>Verified seller</Text>
                      </View>
                    </View>
                    <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]} numberOfLines={1}>
                      {seller?.trustyTag || normalizedQuery}
                    </Text>
                    <Text style={[typography.small, { color: colors.muted, marginTop: spacing.sm }]}>
                      This TrustyTag is linked to a seller account eligible for protected escrow.
                    </Text>
                  </View>
                </View>
              </Card>

              <Card style={{ marginTop: spacing.md, padding: spacing.lg }}>
                <SectionTitle icon="shield-checkmark-outline" title="Trust summary" />
                <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.md }]}>Ready for protected trade</Text>
                <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>
                  Funds stay secured in escrow until the transaction conditions are met and the platform record is complete.
                </Text>

                <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                  <InfoRow label="TrustyTag" value={seller?.trustyTag || normalizedQuery || "Verified"} />
                  <InfoRow label="Account status" value="Verified seller account" />
                  <InfoRow label="Member since" value={formatMemberSince(seller?.createdAt)} />
                  <InfoRow label="Trade flow" value="Escrow eligible" />
                </View>
              </Card>

              <Card style={{ marginTop: spacing.md, padding: spacing.lg }}>
                <SectionTitle icon="lock-closed-outline" title="Platform protection" />
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  <TrustBullet icon="wallet-outline" text="Buyer funds remain protected in escrow while delivery obligations are in progress" />
                  <TrustBullet icon="chatbubble-ellipses-outline" text="Messages, shipping updates, and delivery proofs stay inside the transaction record" />
                  <TrustBullet icon="alert-circle-outline" text="Issues and disputes are handled within the platform if the trade needs intervention" />
                </View>
              </Card>

              <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                <Button
                  title="Start protected trade"
                  onPress={onStartEscrow}
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.primaryText} />}
                />
                <Button
                  title="Edit lookup"
                  onPress={onEditLookup}
                  variant="secondary"
                  leftIcon={<Ionicons name="create-outline" size={18} color={colors.text} />}
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={[typography.bodyStrong, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: alpha("#FFFFFF", 0.04), padding: spacing.md }}>
      <Text style={[typography.eyebrow, { color: colors.muted }]}>{label}</Text>
      <Text style={[typography.small, { color: colors.text, marginTop: spacing.xs }]}>{value}</Text>
    </View>
  );
}

function TrustBullet({ icon, text }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
      <View style={{ width: 26, height: 26, borderRadius: radius.full, backgroundColor: alpha(colors.primary, 0.14), alignItems: "center", justifyContent: "center", marginTop: 2 }}>
        <Ionicons name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={[typography.small, { color: colors.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

function LoadingBar({ width }) {
  return (
    <View
      style={{
        height: 12,
        width,
        borderRadius: radius.full,
        backgroundColor: alpha("#FFFFFF", 0.08),
      }}
    />
  );
}
