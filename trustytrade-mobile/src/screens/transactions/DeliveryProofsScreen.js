import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography, shadows } from "../../constants/theme";
import { listProofs, uploadProof } from "../../services/api";
import { baseURL } from "../../services/apiClient";
import { useSessionStore } from "../../store/sessionStore";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

function normalizeError(err) {
  return String(err?.response?.data?.message || err?.message || "Request failed");
}

export default function DeliveryProofsScreen({ route, navigation }) {
  const txId = String(route?.params?.id || "");
  const accessToken = useSessionStore((s) => s.accessToken);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await listProofs(txId);
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

  const canUpload = useMemo(() => !uploading && !!selectedAsset?.uri, [selectedAsset?.uri, uploading]);

  const chooseFile = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") throw new Error("Media library permission is required");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) throw new Error("No file selected");
    setSelectedAsset(asset);
  };

  function getProofUri(proofId) {
    return `${baseURL}/transactions/${encodeURIComponent(txId)}/proofs/${encodeURIComponent(proofId)}/file`;
  }

  const onPickAndUpload = async () => {
    if (!canUpload) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", {
        uri: selectedAsset.uri,
        name: selectedAsset.fileName || "proof.jpg",
        type: selectedAsset.mimeType || "image/jpeg",
      });
      if (String(note).trim()) form.append("note", String(note).trim());

      await uploadProof(txId, form);
      setNote("");
      setSelectedAsset(null);
      await load();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setUploading(false);
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
                <Text style={[typography.small, { color: colors.muted }]}>Seller evidence</Text>
                <Text style={[typography.h2, { color: colors.text }]}>Delivery proofs</Text>
              </View>
              <Pressable onPress={() => navigation.navigate("ReportIssue", { id: txId })}>
                <Text style={[typography.caption, { color: colors.danger }]}>Report issue</Text>
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
              <View style={{ position: "absolute", right: -36, top: -48, width: 140, height: 140, borderRadius: 70, backgroundColor: alpha(colors.primary, 0.12) }} />
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>Provide verifiable proof</Text>
                  <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.xs }]}>
                    Upload a delivery receipt, parcel image, or courier handoff record tied to this escrow order.
                  </Text>
                  <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
                    <Pressable onPress={load} style={{ borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.06), borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                      <Text style={[typography.caption, { color: colors.text }]}>Refresh proofs</Text>
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("TransactionDetail", { id: txId })} style={{ borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.06), borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                      <Text style={[typography.caption, { color: colors.text }]}>Order overview</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            <Card elevated>
              <Button
                title={selectedAsset?.fileName ? "Choose another file" : "Choose file"}
                variant="secondary"
                onPress={async () => {
                  try {
                    setError(null);
                    await chooseFile();
                  } catch (e) {
                    setError(normalizeError(e));
                  }
                }}
                leftIcon={<Ionicons name="cloud-upload-outline" size={18} color={colors.text} />}
              />
              {selectedAsset?.fileName ? (
                <Text style={[typography.small, { color: colors.muted, marginTop: spacing.sm }]}>Selected: {selectedAsset.fileName}</Text>
              ) : null}
              {selectedAsset?.uri ? (
                <View style={{ marginTop: spacing.md, overflow: "hidden", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: selectedAsset.uri }} style={{ width: "100%", height: 220, backgroundColor: colors.surface3 }} resizeMode="cover" />
                </View>
              ) : null}
              <Input
                label="Note"
                value={note}
                onChangeText={setNote}
                placeholder="Courier name, shipment handoff, tracking update..."
                multiline
              />
              {!!error ? (
                <Card style={{ backgroundColor: alpha(colors.warning, 0.1), borderColor: alpha(colors.warning, 0.35), padding: spacing.md, marginTop: spacing.md }}>
                  <Text style={[typography.small, { color: colors.text }]}>{error}</Text>
                </Card>
              ) : null}
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title="Submit proof"
                  onPress={onPickAndUpload}
                  disabled={!canUpload}
                  loading={uploading}
                  leftIcon={!uploading ? <Ionicons name="send" size={16} color={colors.primaryText} /> : null}
                />
              </View>
            </Card>
          </View>
          }
          renderItem={({ item }) => {
          const isImage = String(item?.mimeType || "").startsWith("image/");
          return (
            <Card style={{ marginBottom: spacing.md, overflow: "hidden", padding: 0 }}>
              {isImage ? (
                <Image
                  source={{
                    uri: getProofUri(item?.id),
                    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                  }}
                  style={{ width: "100%", height: 220, backgroundColor: colors.surface3 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ height: 120, alignItems: "center", justifyContent: "center", backgroundColor: alpha("#FFFFFF", 0.03) }}>
                  <Ionicons name="document-attach-outline" size={28} color={colors.primary} />
                </View>
              )}
              <View style={{ padding: spacing.lg }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                  <Text style={[typography.bodyStrong, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                    {item?.originalFileName || "Delivery proof"}
                  </Text>
                  <View style={{ borderRadius: radius.full, backgroundColor: alpha("#FFFFFF", 0.06), borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                    <Text style={[typography.caption, { color: colors.text }]}>{item?.size ? `${Math.max(1, Math.round(Number(item.size) / 1024))} KB` : "File"}</Text>
                  </View>
                </View>
                <Text style={[typography.caption, { color: colors.muted, marginTop: spacing.xs }]}>
                  {item?.createdAt ? new Date(item.createdAt).toLocaleString("en-NG") : "Uploaded"}
                </Text>
                <Text style={[typography.small, { color: colors.mutedSoft, marginTop: spacing.sm }]}>
                  {String(item?.note || "No note added.")}
                </Text>
              </View>
            </Card>
          );
          }}
          ListEmptyComponent={
          <Card style={{ borderStyle: "dashed", alignItems: "center", paddingVertical: spacing.xxl }}>
            <Text style={{ fontSize: 28 }}>📦</Text>
            <Text style={[typography.bodyStrong, { color: colors.text, marginTop: spacing.sm }]}>No proofs uploaded</Text>
            <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs, textAlign: "center" }]}>
              Upload a delivery photo or receipt so the buyer and support team can verify fulfillment.
            </Text>
          </Card>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
