import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import { getMyBankAccount, listBanks, updateMyBankAccount } from "../../services/api";
import { useSessionStore } from "../../store/sessionStore";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

function dedupeBanks(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter((bank, index) => {
    const key = `${String(bank?.code || "").trim()}::${String(bank?.name || "").trim().toLowerCase()}::${index}`;
    const dedupeKey = `${String(bank?.code || "").trim()}::${String(bank?.name || "").trim().toLowerCase()}`;
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return Boolean(key);
  });
}

function BankRow({ bank, onSelect }) {
  return (
    <Pressable
      onPress={() => onSelect(bank)}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.surface2,
        borderColor: colors.border,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="business-outline" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.small, { color: colors.text }]} numberOfLines={1}>
          {bank?.name || "—"}
        </Text>
        <Text style={[typography.small, { color: colors.muted, marginTop: 4 }]} numberOfLines={1}>
          Code: {bank?.code || "—"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function BankAccountScreen() {
  const user = useSessionStore((s) => s.user);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";
  const [summary, setSummary] = useState(null);
  const [banks, setBanks] = useState([]);
  const [bankQuery, setBankQuery] = useState("");
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    const [b, s] = await Promise.all([listBanks(), getMyBankAccount()]);
    setBanks(dedupeBanks(b));
    setSummary(s || null);
    setOk(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (e) {
        setError(normalizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const canSave = useMemo(() => {
    const n = String(accountNumber || "").replace(/[^\d]/g, "");
    return !saving && String(bankCode).trim() && n.length === 10;
  }, [accountNumber, bankCode, saving]);

  const selectedBank = useMemo(
    () => banks.find((bank) => String(bank?.code || "") === String(bankCode || "")) || null,
    [bankCode, banks],
  );

  const filteredBanks = useMemo(() => {
    const q = String(bankQuery || "").trim().toLowerCase();
    const base = q
      ? banks.filter((bank) => {
          const name = String(bank?.name || "").toLowerCase();
          const code = String(bank?.code || "").toLowerCase();
          return name.includes(q) || code.includes(q);
        })
      : banks;
    return base.slice(0, 12);
  }, [bankQuery, banks]);

  const onSelectBank = (bank) => {
    setBankCode(String(bank?.code || ""));
    setBankQuery(String(bank?.name || ""));
    setShowBankPicker(false);
  };

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await updateMyBankAccount({
        bankCode: String(bankCode).trim(),
        accountNumber: String(accountNumber).replace(/[^\d]/g, ""),
        accountName: String(accountName).trim() || undefined,
      });
      setSummary(res || null);
      setOk(true);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          <View style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.h2, { color: colors.text }]}>{isSeller ? "Payout bank account" : "Refund bank account"}</Text>
          <Text style={[typography.body, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
            {isSeller ? "Released seller payouts use this verified bank destination." : "Anchor and refund flows use this verified bank destination."}
          </Text>

          <Card style={{ marginTop: spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>{isSeller ? "Seller payout destination" : "Buyer refund destination"}</Text>
                <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]}>
                  {isSeller ? "Used when escrow is released in your favor." : "Used when refunds are returned in your favor."}
                </Text>
              </View>
            </View>
          </Card>

          {summary?.linked ? (
            <Card style={{ marginTop: spacing.md }}>
              <Text style={[typography.eyebrow, { color: colors.muted }]}>{isSeller ? "Current payout bank account" : "Current refund bank account"}</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.sm }]}>{String(summary?.bankName || "Bank")}</Text>
              <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{String(summary?.accountName || "Account")} · {String(summary?.accountNumberMasked || "******")}</Text>
            </Card>
          ) : null}

            <Card style={{ marginTop: spacing.md }}>
            <View style={{ marginTop: 0 }}>
              <Text style={[typography.eyebrow, { color: colors.muted, marginBottom: spacing.sm }]}>Bank selection</Text>
              <Pressable onPress={() => setShowBankPicker(true)}>
                <Card style={{ padding: spacing.md, backgroundColor: colors.surface2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="business-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                        {selectedBank?.name || "Choose bank"}
                      </Text>
                      <Text style={[typography.small, { color: colors.muted, marginTop: 2 }]} numberOfLines={1}>
                        {selectedBank?.code ? `Code: ${selectedBank.code}` : "Open bank picker"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </View>
                </Card>
              </Pressable>
            </View>

            <Input
              label="Account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              placeholder="10 digits"
              icon={<Ionicons name="card-outline" size={18} color={colors.muted} />}
            />
            <Input
              label="Account name (optional)"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Must match bank records"
              icon={<Ionicons name="person-circle-outline" size={18} color={colors.muted} />}
            />

            {!!error ? (
              <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.12), borderWidth: 1, borderColor: alpha(colors.danger, 0.3), padding: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
              </View>
            ) : null}
            {!!ok && !error ? (
              <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.success, 0.12), borderWidth: 1, borderColor: alpha(colors.success, 0.3), padding: spacing.md }}>
                <Text style={[typography.small, { color: colors.text }]}>{isSeller ? "Payout account saved" : "Refund account saved"}</Text>
              </View>
            ) : null}

            <Button
              title={isSeller ? "Save payout account" : "Save refund account"}
              onPress={onSave}
              disabled={!canSave}
              loading={saving}
              style={{ marginTop: spacing.lg }}
              leftIcon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.primaryText} />}
            />

            <Text style={[typography.small, { color: colors.muted, marginTop: spacing.lg }]}>
              {selectedBank?.code ? `Selected bank code: ${selectedBank.code}` : "Choose a bank first, then save your account details."}
            </Text>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showBankPicker} animationType="slide" transparent onRequestClose={() => setShowBankPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: alpha("#050505", 0.82), justifyContent: "flex-end" }} onPress={() => setShowBankPicker(false)}>
          <KeyboardAvoidingView style={{ justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Pressable
              onPress={() => {}}
              style={{
                maxHeight: "78%",
                backgroundColor: colors.bg,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.lg,
                paddingBottom: spacing.xl,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h3, { color: colors.text }]}>Choose bank</Text>
                  <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>Search and select from supported banks.</Text>
                </View>
                <Pressable onPress={() => setShowBankPicker(false)} style={{ padding: spacing.xs }}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>

              <Input
                label="Search bank"
                value={bankQuery}
                onChangeText={setBankQuery}
                autoCapitalize="words"
                placeholder="Search by bank name or code"
                style={{ marginTop: spacing.md }}
                icon={<Ionicons name="search-outline" size={18} color={colors.muted} />}
              />

              <Text style={[typography.small, { color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.sm }]}>
                Showing {filteredBanks.length} matching banks
              </Text>

              <FlatList
                data={filteredBanks}
                keyExtractor={(item, idx) => `${String(item?.code || "bank")}-${String(item?.name || "item")}-${idx}`}
                renderItem={({ item }) => <BankRow bank={item} onSelect={onSelectBank} />}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Card>
                    <Text style={[typography.small, { color: colors.muted }]}>
                      {bankQuery ? "No banks match that search." : "No bank list available."}
                    </Text>
                  </Card>
                }
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
