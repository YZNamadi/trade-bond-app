import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Share, Text, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";
import { baseURL } from "../../services/apiClient";
import { addDisputeNote, getDispute, submitDisputeEvidence } from "../../services/api";
import { useSessionStore } from "../../store/sessionStore";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function DisputeDetailScreen({ route }) {
  const disputeId = String(route?.params?.id || "");
  const user = useSessionStore((s) => s.user);
  const accessToken = useSessionStore((s) => s.accessToken);
  const isSeller = String(user?.role || "").toLowerCase() === "seller";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState("");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const res = await getDispute(disputeId);
    setData(res || null);
  }, [disputeId]);

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

  const notes = useMemo(() => {
    const raw = data?.notes || data?.events || data?.timeline || [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);
  const evidence = useMemo(() => {
    const raw = data?.evidence || [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  function evidenceUri(evidenceId) {
    return `${baseURL}/disputes/${encodeURIComponent(disputeId)}/evidence/${encodeURIComponent(evidenceId)}/file`;
  }

  const onAddNote = async () => {
    const text = String(note).trim();
    if (!text || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      await addDisputeNote(disputeId, { text, evidenceId: selectedEvidenceId || undefined });
      setNote("");
      setSelectedEvidenceId(null);
      await load();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const onUploadEvidence = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") throw new Error("Media library permission is required");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error("No file selected");

      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.fileName || "evidence.jpg",
        type: asset.mimeType || "image/jpeg",
      });
      if (String(note).trim()) form.append("note", String(note).trim());
      await submitDisputeEvidence(disputeId, form);
      setNote("");
      await load();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const onOpenEvidence = async (item) => {
    if (!item?.id || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const target =
        `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ""}${item?.originalFileName || `${item.id}.bin`}`;
      const result = await FileSystem.downloadAsync(evidenceUri(item.id), target, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      await Share.share({
        url: result.uri,
        title: item?.originalFileName || "Dispute evidence",
        message: item?.originalFileName || "Dispute evidence",
      });
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActionLoading(false);
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
        <FlatList
          data={notes}
          keyExtractor={(item, idx) => String(item?.id || item?.createdAt || idx)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <Card>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.12), alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="warning-outline" size={20} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h2, { color: colors.text }]}>Dispute</Text>
                  {!!data?.status && (
                    <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>
                      Status: {String(data.status).toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>
              {!!data?.status && (
                <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.08), borderWidth: 1, borderColor: alpha(colors.danger, 0.2), padding: spacing.md }}>
                  <Text style={[typography.small, { color: colors.mutedSoft }]}>
                    {isSeller ? "This order is in protected review while seller evidence, buyer notes, and support updates are assessed." : "This transaction is locked while evidence and notes are reviewed."}
                  </Text>
                </View>
              )}
              {!!data?.transactionId && <Text style={[typography.small, { color: colors.muted, marginTop: spacing.md }]} selectable>Transaction: {String(data.transactionId)}</Text>}

              {!!error && (
                <View style={{ marginTop: spacing.md, borderRadius: radius.md, backgroundColor: alpha(colors.danger, 0.12), borderWidth: 1, borderColor: alpha(colors.danger, 0.3), padding: spacing.md }}>
                  <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
                </View>
              )}

              <View style={{ marginTop: spacing.lg }}>
                <Input
                  label={isSeller ? "Add seller note" : "Add note"}
                  value={note}
                  onChangeText={setNote}
                  placeholder={isSeller ? "Add operational context, shipping details, or your requested resolution..." : "Describe the issue..."}
                  multiline
                  style={{ marginTop: 0 }}
                  icon={<Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.muted} />}
                />
                {selectedEvidenceId ? (
                  <View style={{ marginTop: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: alpha(colors.success, 0.3), backgroundColor: alpha(colors.success, 0.1), padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.success }]}>Linked evidence</Text>
                      <Text style={[typography.small, { color: colors.text, marginTop: spacing.xs }]}>This note will be attached to the selected evidence item.</Text>
                    </View>
                    <Pressable onPress={() => setSelectedEvidenceId(null)}>
                      <Text style={[typography.caption, { color: colors.primary }]}>Clear</Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  <Button title={isSeller ? "Add case note" : "Add note"} onPress={onAddNote} disabled={!String(note).trim() || actionLoading} loading={actionLoading && !!String(note).trim()} leftIcon={<Ionicons name="chatbubble-outline" size={18} color={colors.primaryText} />} />
                  <Button title={isSeller ? "Upload supporting evidence" : "Upload evidence"} variant="secondary" onPress={onUploadEvidence} disabled={actionLoading} leftIcon={<Ionicons name="cloud-upload-outline" size={18} color={colors.text} />} />
                </View>
              </View>
            </Card>

            <Text style={[typography.eyebrow, { color: colors.muted, marginTop: spacing.lg }]}>Evidence</Text>
            {evidence.length === 0 ? (
              <Card style={{ marginTop: spacing.sm }}>
                <Text style={[typography.small, { color: colors.muted }]}>
                  No evidence uploaded yet.
                </Text>
              </Card>
            ) : (
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                {evidence.map((item) => {
                  const isImage = String(item?.mimeType || "").startsWith("image/");
                  return (
                    <Card key={String(item?.id)} style={{ overflow: "hidden", padding: 0 }}>
                      {isImage ? (
                        <Image
                          source={{
                            uri: evidenceUri(item?.id),
                            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                          }}
                          style={{ width: "100%", height: 180, backgroundColor: colors.surface3 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ height: 100, alignItems: "center", justifyContent: "center", backgroundColor: alpha("#FFFFFF", 0.03) }}>
                          <Ionicons name="document-attach-outline" size={28} color={colors.primary} />
                        </View>
                      )}
                      <View style={{ padding: spacing.lg }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md, alignItems: "center" }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                              {item?.originalFileName || "Evidence file"}
                            </Text>
                            <Text style={[typography.caption, { color: colors.muted, marginTop: spacing.xs }]}>
                              {String(item?.uploadedByRole || "user").toUpperCase()} · {item?.createdAt ? new Date(item.createdAt).toLocaleString("en-NG") : "Uploaded"}
                            </Text>
                          </View>
                          <View style={{ borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.06), borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                            <Text style={[typography.caption, { color: colors.text }]}>
                              {item?.size ? `${Math.max(1, Math.round(Number(item.size) / 1024))} KB` : "File"}
                            </Text>
                          </View>
                        </View>
                        {!!item?.note ? (
                          <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.sm }]}>
                            {String(item.note)}
                          </Text>
                        ) : null}
                        {Array.isArray(item?.annotations) && item.annotations.length > 0 ? (
                          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                            <Text style={[typography.eyebrow, { color: colors.muted }]}>Annotations</Text>
                            {item.annotations.map((annotation, index) => (
                              <View key={`${item?.id}-annotation-${index}`} style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: alpha("#FFFFFF", 0.04), padding: spacing.md }}>
                                <Text style={[typography.caption, { color: colors.muted }]}>
                                  {String(annotation?.byRole || "user").toUpperCase()} · {annotation?.at ? new Date(annotation.at).toLocaleString("en-NG") : "Update"}
                                </Text>
                                <Text style={[typography.small, { color: colors.text, marginTop: spacing.xs }]}>{String(annotation?.text || "")}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        <Pressable
                          onPress={() => setSelectedEvidenceId((current) => (current === item?.id ? null : item?.id))}
                          style={{ marginTop: spacing.md, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs }}
                        >
                          <Ionicons name={selectedEvidenceId === item?.id ? "checkmark-circle" : "attach-outline"} size={14} color={selectedEvidenceId === item?.id ? colors.success : colors.primary} />
                          <Text style={[typography.caption, { color: selectedEvidenceId === item?.id ? colors.success : colors.primary }]}>
                            {selectedEvidenceId === item?.id ? "Note linked to this evidence" : "Attach next note to this evidence"}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => onOpenEvidence(item)} style={{ marginTop: spacing.md, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                          <Ionicons name="download-outline" size={14} color={colors.primary} />
                          <Text style={[typography.caption, { color: colors.primary }]}>Open or share file</Text>
                        </Pressable>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}

            <Text style={[typography.eyebrow, { color: colors.muted, marginTop: spacing.lg }]}>Timeline</Text>
          </View>
          }
          renderItem={({ item }) => {
          const title = String(item?.title || item?.type || "Update");
          const body = String(item?.text || item?.body || item?.description || "");
          return (
            <Card style={{ marginBottom: spacing.md }}>
              <Text style={[typography.h3, { color: colors.text }]}>{title}</Text>
              {!!body && <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{body}</Text>}
            </Card>
          );
          }}
          ListEmptyComponent={
          <Card>
            <Text style={[typography.small, { color: colors.muted }]}>
              No dispute activity yet.
            </Text>
          </Card>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
