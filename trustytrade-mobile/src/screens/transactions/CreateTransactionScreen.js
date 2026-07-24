import React, { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { createTransaction, getSellerByTrustyTag } from "../../services/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function CreateTransactionScreen({ navigation, route }) {
  const presetSeller = route?.params?.seller || null;
  const presetSellerId = route?.params?.sellerId || presetSeller?.id || null;
  const presetTrustyTag = route?.params?.trustyTag || presetSeller?.trustyTag || "";

  const [step, setStep] = useState(presetSellerId ? 1 : 0);
  const [trustyTag, setTrustyTag] = useState(String(presetTrustyTag || ""));
  const [sellerId, setSellerId] = useState(String(presetSellerId || ""));
  const [seller, setSeller] = useState(presetSeller || null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cleanAmount = useMemo(() => Number(String(amount).replace(/[^\d.]/g, "")), [amount]);
  const canValidateSeller = useMemo(() => !loading && String(trustyTag).trim().length >= 2, [loading, trustyTag]);
  const canContinueDetails = useMemo(() => !loading && String(title).trim().length > 1 && Number.isFinite(cleanAmount) && cleanAmount >= 1000, [cleanAmount, loading, title]);
  const canSubmit = useMemo(() => !loading && String(sellerId).trim() && canContinueDetails, [canContinueDetails, loading, sellerId]);

  const resolveSellerId = async () => {
    const existing = String(sellerId || "").trim();
    if (existing) return existing;
    const tag = String(trustyTag || "").trim();
    if (!tag) throw new Error("Enter a seller TrustyTag");
    const found = await getSellerByTrustyTag(tag);
    const id = String(found?.id || "").trim();
    if (!id) throw new Error("Seller not found");
    setSellerId(id);
    setSeller(found || null);
    return id;
  };

  const onValidateSeller = async () => {
    if (!canValidateSeller) return;
    setLoading(true);
    setError(null);
    try {
      await resolveSellerId();
      setStep(1);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const onNext = () => {
    if (step === 1 && !canContinueDetails) return;
    setStep((current) => Math.min(current + 1, 2));
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const sid = await resolveSellerId();
      const fullDescription = [String(title).trim(), String(description).trim()].filter(Boolean).join("\n");
      const res = await createTransaction({
        sellerId: sid,
        amount: cleanAmount,
        description: fullDescription,
      });
      const tx = res?.body || res;
      if (!tx?.id) throw new Error("Transaction created but missing id");
      const parent = navigation.getParent?.();
      if (parent?.navigate) {
        parent.navigate("Transactions", {
          screen: "Payment",
          params: { id: tx.id, justCreated: true, createdAt: Date.now() },
        });
      } else {
        navigation.replace("Payment", { id: tx.id, justCreated: true, createdAt: Date.now() });
      }
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const sellerHandle = seller?.trustyTag || seller?.username || trustyTag;
  const sellerName = seller?.fullName || seller?.name || "Verified seller";
  const firstLine = String(title).trim() || "Escrow purchase";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <Pressable
              onPress={() => (step === 0 ? navigation.goBack() : setStep((current) => Math.max(current - 1, 0)))}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[typography.small, { color: colors.muted }]}>Step {step + 1} of 3</Text>
              <Text style={[typography.bodyStrong, { color: colors.text }]}>
                {step === 0 ? "Enter TrustyTag" : step === 1 ? "Transaction details" : "Review"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.md }}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: index <= step ? colors.primary : alpha("#FFFFFF", 0.08) }} />
            ))}
          </View>

          {step === 0 ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={[typography.h2, { color: colors.text }]}>Enter seller TrustyTag</Text>
              <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Use the seller’s TrustyTag to validate who you are paying before escrow starts.</Text>
              <Card elevated style={{ marginTop: spacing.xl }}>
                <Input
                  label="TrustyTag"
                  value={trustyTag}
                  onChangeText={(v) => {
                    setTrustyTag(v);
                    if (!presetSellerId) {
                      setSellerId("");
                      setSeller(null);
                    }
                  }}
                  autoCapitalize="none"
                  placeholder="@techhaven.ng"
                  style={{ marginTop: 0 }}
                  icon={<Ionicons name="search-outline" size={18} color={colors.muted} />}
                />
                {!!seller ? (
                  <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: colors.accent, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                      <Text style={[typography.caption, { color: colors.primaryText }]}>{String(sellerName).slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyStrong, { color: colors.text }]}>{sellerName}</Text>
                      <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>{sellerHandle}</Text>
                    </View>
                  </View>
                ) : null}
                <Button
                  title="Validate TrustyTag"
                  onPress={onValidateSeller}
                  loading={loading}
                  disabled={!canValidateSeller}
                  style={{ marginTop: spacing.xl }}
                  leftIcon={<Ionicons name="arrow-forward" size={18} color={colors.primaryText} />}
                />
              </Card>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={[typography.h2, { color: colors.text }]}>Add deal details</Text>
              <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Describe what is being purchased and how much escrow should hold.</Text>
              <Card elevated style={{ marginTop: spacing.xl }}>
                <Input
                  label="Item title"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. iPhone 15 Pro Max 256GB"
                  style={{ marginTop: 0 }}
                  icon={<Ionicons name="cube-outline" size={18} color={colors.muted} />}
                />
                <Input
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Color, condition, delivery details..."
                  multiline
                  icon={<Ionicons name="document-text-outline" size={18} color={colors.muted} />}
                />
                <Input
                  label="Amount"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  icon={<Text style={[typography.bodyStrong, { color: colors.muted }]}>₦</Text>}
                />
                <Button title="Continue" onPress={onNext} disabled={!canContinueDetails} style={{ marginTop: spacing.xl }} leftIcon={<Ionicons name="arrow-forward" size={18} color={colors.primaryText} />} />
              </Card>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={[typography.h2, { color: colors.text }]}>Review</Text>
              <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>Confirm the seller, item, and amount before opening secure checkout.</Text>
              <View
                style={[
                  {
                    marginTop: spacing.xl,
                    borderRadius: radius.xl,
                    backgroundColor: colors.surface,
                    padding: spacing.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                  shadows.soft,
                ]}
              >
                <Text style={[typography.eyebrow, { color: colors.muted }]}>Escrow amount</Text>
                <Text style={[typography.h1, { color: colors.text, marginTop: spacing.xs }]}>₦{Number.isFinite(cleanAmount) ? cleanAmount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</Text>
                <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                  <SummaryRow label="Seller" value={sellerName} />
                  <SummaryRow label="TrustyTag" value={sellerHandle || "—"} />
                  <SummaryRow label="Item" value={firstLine} />
                  <SummaryRow label="Details" value={String(description).trim() || "No extra details"} multiline />
                </View>
              </View>

              <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: colors.accent, padding: spacing.md, flexDirection: "row", gap: spacing.sm }}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text style={[typography.small, { color: colors.mutedSoft, flex: 1 }]}>Funds stay locked in escrow until delivery is confirmed or a dispute is resolved.</Text>
              </View>

              <Button
                title="Create transaction"
                onPress={onSubmit}
                disabled={!canSubmit}
                loading={loading}
                style={{ marginTop: spacing.xl }}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.primaryText} />}
              />
            </View>
          ) : null}

          {!!error ? (
            <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.12), borderWidth: 1, borderColor: alpha(colors.danger, 0.32), padding: spacing.md }}>
              <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, multiline = false }) {
  return (
    <View style={{ flexDirection: multiline ? "column" : "row", justifyContent: "space-between", gap: spacing.sm }}>
      <Text style={[typography.small, { color: colors.muted }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color: colors.text, flex: multiline ? 0 : 1, textAlign: multiline ? "left" : "right" }]}>{value}</Text>
    </View>
  );
}
