import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { addDisputeNote, getDisputeByTransaction, openDispute } from "../../services/api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function ReportIssueScreen({ route, navigation }) {
  const txId = String(route?.params?.id || "");
  const existingDisputeId = route?.params?.disputeId ? String(route.params.disputeId) : null;
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [disputeId, setDisputeId] = useState(existingDisputeId);

  useEffect(() => {
    (async () => {
      if (existingDisputeId) {
        setChecking(false);
        return;
      }
      setChecking(true);
      try {
        const res = await getDisputeByTransaction(txId);
        if (res?.id) setDisputeId(String(res.id));
      } catch {}
      setChecking(false);
    })();
  }, [existingDisputeId, txId]);

  const ctaTitle = useMemo(() => (disputeId ? "Add case note" : "Open issue"), [disputeId]);

  const onSubmit = async () => {
    const text = String(message).trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      let nextDisputeId = disputeId;
      if (!nextDisputeId) {
        const opened = await openDispute(txId);
        nextDisputeId = String(opened?.id || opened?.dispute?.id || "");
      }
      if (!nextDisputeId) throw new Error("Unable to open dispute");
      await addDisputeNote(nextDisputeId, { text });
      navigation.replace("DisputeDetail", { id: nextDisputeId });
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl }}
        >
          <Text style={[typography.small, { color: colors.muted }]}>Order support</Text>
          <Text style={[typography.h2, { color: colors.text }]}>Report issue</Text>
          <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
            Describe the operational problem clearly. Avoid card details, OTPs, or any off-platform settlement information.
          </Text>

          <View
            style={[
              {
                marginTop: spacing.lg,
                borderRadius: radius.xl,
                backgroundColor: alpha(colors.danger, 0.08),
                borderWidth: 1,
                borderColor: alpha(colors.danger, 0.28),
                padding: spacing.lg,
                overflow: "hidden",
              },
              shadows.soft,
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
              <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.16), alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>
                  {disputeId ? "This order already has an active dispute" : "Open a protected issue log"}
                </Text>
                <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
                  {disputeId
                    ? "Your next note will be added to the existing case so support can continue review without losing context."
                    : "Submitting this creates a dispute record and freezes escrow while the issue is reviewed."}
                </Text>
              </View>
            </View>
          </View>

          <Card elevated style={{ marginTop: spacing.md }}>
            <Input
              label="Issue details"
              value={message}
              onChangeText={setMessage}
              placeholder="What happened? What did you try? Any shipping or buyer updates?"
              multiline
              icon={<Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />}
            />

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={[typography.small, { color: colors.mutedSoft, flex: 1 }]}>Include tracking context, delivery attempts, and what resolution you need.</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={[typography.small, { color: colors.mutedSoft, flex: 1 }]}>You can upload supporting evidence after the dispute record opens.</Text>
              </View>
            </View>

            {!!error ? (
              <Card style={{ backgroundColor: alpha(colors.danger, 0.12), borderColor: alpha(colors.danger, 0.35), padding: spacing.md, marginTop: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
              </Card>
            ) : null}

            <View style={{ marginTop: spacing.lg }}>
              <Button
                title={ctaTitle}
                variant="danger"
                onPress={onSubmit}
                disabled={!String(message).trim() || loading}
                loading={loading}
                leftIcon={!loading ? <Ionicons name="warning-outline" size={16} color={colors.primaryText} /> : null}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
