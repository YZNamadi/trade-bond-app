import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { alpha, colors, radius, spacing, typography } from "../../constants/theme";

function formatWhen(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-NG", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

function iconFor(type) {
  const t = String(type || "").toUpperCase();
  if (t.includes("PAYMENT")) return { name: "card-outline", tone: colors.primary };
  if (t.includes("ESCROW") || t.includes("FUNDED")) return { name: "shield-checkmark-outline", tone: colors.success };
  if (t.includes("SHIPPING")) return { name: "cube-outline", tone: colors.primary };
  if (t.includes("DELIVERY")) return { name: "checkmark-done-outline", tone: colors.success };
  if (t.includes("DISPUTE")) return { name: "warning-outline", tone: colors.danger };
  if (t.includes("PAYOUT")) return { name: "cash-outline", tone: colors.success };
  if (t.includes("REFUND")) return { name: "return-up-back-outline", tone: colors.warning };
  return { name: "time-outline", tone: colors.muted };
}

export default function TransactionTimeline({ events }) {
  const rows = useMemo(() => (Array.isArray(events) ? events : []), [events]);

  if (rows.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
        }}
      >
        <Text style={[typography.small, { color: colors.muted }]}>No timeline events yet.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((e, idx) => {
        const meta = iconFor(e?.type);
        const when = formatWhen(e?.createdAt);
        const title = String(e?.title || e?.type || "Update");
        const desc = e?.description ? String(e.description) : "";
        const isLast = idx === rows.length - 1;
        return (
          <View key={`${String(e?.id || "event")}-${String(e?.createdAt || idx)}-${idx}`} style={{ flexDirection: "row" }}>
            <View style={{ width: 28, alignItems: "center" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: alpha("#FFFFFF", 0.06),
                  borderColor: colors.border,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={meta.name} size={16} color={meta.tone} />
              </View>
              {!isLast && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    backgroundColor: colors.border,
                    marginTop: spacing.sm,
                  }}
                />
              )}
            </View>

            <View style={{ flex: 1, paddingLeft: spacing.md, paddingBottom: isLast ? 0 : spacing.md }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
                <Text style={[typography.bodyStrong, { color: colors.text }]}>{title}</Text>
              {!!desc && <Text style={[typography.small, { color: colors.muted, marginTop: 4 }]}>{desc}</Text>}
              {!!when && <Text style={[typography.small, { color: colors.muted, marginTop: spacing.xs }]}>{when}</Text>}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
