import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { listTransactionMessages, sendTransactionMessage } from "../../services/api";
import { useSessionStore } from "../../store/sessionStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function bubbleStyle(isMine) {
  return {
    maxWidth: "86%",
    alignSelf: isMine ? "flex-end" : "flex-start",
    backgroundColor: isMine ? colors.primary : alpha("#FFFFFF", 0.06),
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderColor: isMine ? alpha(colors.primary, 0.35) : colors.border,
    borderWidth: 1,
  };
}

export default function ChatScreen({ route }) {
  const txId = String(route?.params?.id || "");
  const me = useSessionStore((s) => s.user);
  const role = String(me?.role || "").toLowerCase();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await listTransactionMessages(txId);
    setRows(Array.isArray(res) ? res : []);
  }, [txId]);

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

  const canSend = useMemo(() => !sending && String(text).trim().length > 0, [sending, text]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setRefreshing(false);
    }
  };

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await sendTransactionMessage(txId, { text: String(text).trim() });
      setText("");
      await load();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item?.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.lg, gap: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.small, { color: colors.muted }]}>Secure chat</Text>
                  <Text style={[typography.h2, { color: colors.text }]}>Transaction messages</Text>
                </View>
                <Pressable onPress={onRefresh} style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}>
                  <Text style={[typography.caption, { color: refreshing ? colors.muted : colors.primary }]}>
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Text>
                </Pressable>
              </View>

              <View
                style={[
                  {
                    borderRadius: radius.xl,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing.lg,
                    overflow: "hidden",
                  },
                  shadows.soft,
                ]}
              >
                <View style={{ position: "absolute", right: -24, top: -24, width: 120, height: 120, borderRadius: 60, backgroundColor: alpha(colors.primary, 0.14) }} />
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                  <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: colors.text }]}>Transaction-only messaging</Text>
                    <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
                      Messages stay attached to this escrow so buyer, seller, and admin can review them if a dispute is opened.
                    </Text>
                    <View style={{ marginTop: spacing.sm, alignSelf: "flex-start", borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.06), borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                      <Text style={[typography.caption, { color: colors.text }]}>
                        {role === "seller" ? "Seller conversation log" : "Buyer conversation log"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isMine =
              String(item?.senderUserId || "") === String(me?.id || "") ||
              String(item?.senderRole || "").toLowerCase() === role;
            const body = typeof item?.body === "string" ? item.body : typeof item?.text === "string" ? item.text : "";
            return (
              <View style={{ marginBottom: spacing.md }}>
                <View style={bubbleStyle(isMine)}>
                  <Text style={[typography.caption, { color: isMine ? alpha(colors.primaryText, 0.72) : colors.muted, marginBottom: 6 }]}>
                    {String(item?.senderRole || "user").toUpperCase()}
                  </Text>
                  <Text style={[typography.small, { color: isMine ? colors.primaryText : colors.text }]}>{body}</Text>
                </View>
                <Text style={[typography.caption, { color: colors.muted, marginTop: 6, alignSelf: isMine ? "flex-end" : "flex-start" }]}>
                  {formatTime(item?.createdAt)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Card style={{ borderStyle: "dashed", alignItems: "center", paddingVertical: spacing.xxl }}>
              <Text style={{ fontSize: 28 }}>💬</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.sm }]}>No messages yet</Text>
              <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs, textAlign: "center" }]}>
                Start the thread to coordinate shipping, delivery, and proof updates inside escrow.
              </Text>
            </Card>
          }
        />

        {!!error && (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <Card style={{ backgroundColor: alpha(colors.warning, 0.1), borderColor: alpha(colors.warning, 0.35), padding: spacing.md }}>
              <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
            </Card>
          </View>
        )}

        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: alpha(colors.surface3, 0.96) }}>
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.eyebrow, { color: colors.muted, marginBottom: spacing.xs }]}>Reply</Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255, 255, 255, 0.45)"
                multiline
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  color: colors.text,
                  maxHeight: 120,
                }}
              />
            </View>
            <View style={{ width: 132 }}>
              <Button
                title="Send"
                onPress={onSend}
                disabled={!canSend}
                loading={sending}
                leftIcon={!sending ? <Ionicons name="send" size={16} color={colors.primaryText} /> : null}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
