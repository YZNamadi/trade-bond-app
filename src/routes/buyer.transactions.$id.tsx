import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, AlertTriangle, Sparkles, Lock, BadgeCheck, Copy } from "lucide-react";
import { formatNGN, store, useStore, type TxState } from "@/lib/mock-store";
import { TxStatusBadge } from "@/components/TxStatusBadge";
import { TxTimeline } from "@/components/TxTimeline";
import { toast } from "sonner";
import { PaymentDialog } from "@/components/PaymentDialog";

export const Route = createFileRoute("/buyer/transactions/$id")({
  component: TxDetails,
});

function TxDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const tx = useStore((s) => s.transactions.find((t) => t.id === id));
  const session = useStore((s) => s.session);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState<{
    authorizationUrl: string | null;
    reference: string;
    provider?: string;
    collectionStrategy?: string;
    accountNumber?: string | null;
    accountName?: string | null;
    bankName?: string | null;
    expiresAt?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Array<{ type: string; title: string; description?: string | null; createdAt: number }>>([]);
  const [disputeId, setDisputeId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      store.refreshTransaction(id),
      store.fetchTransactionEvents(id).then((e) => { if (alive) setEvents(e as any); }),
      store.fetchDisputeByTransaction(id).then((d: any) => { if (alive) setDisputeId(d?.id ?? null); }).catch(() => { if (alive) setDisputeId(null); }),
    ])
      .catch(() => null)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const friendlyStatus = useMemo(() => {
    switch (tx?.state) {
      case "CREATED":
        return { label: "Awaiting Payment", sub: "Fund escrow to secure this deal", tone: "warning" as const };
      case "FUNDED":
        return { label: "In Escrow", sub: "Funds protected until you confirm delivery", tone: "success" as const };
      case "SHIPPED":
        return { label: "Awaiting Confirmation", sub: "Confirm delivery to release funds", tone: "primary" as const };
      case "DELIVERED":
        return { label: "Confirming", sub: "Finalizing escrow release", tone: "primary" as const };
      case "RELEASE_PENDING":
        return { label: "Release Processing", sub: "Provider is sending payout to seller", tone: "primary" as const };
      case "RELEASED":
        return { label: "Completed", sub: "Escrow released safely", tone: "success" as const };
      case "DISPUTED":
        return { label: "Disputed", sub: "Escrow is frozen during review", tone: "danger" as const };
      case "REFUND_PENDING":
        return { label: "Refund Processing", sub: "Provider is processing refund to buyer", tone: "warning" as const };
      case "REFUNDED":
        return { label: "Refunded", sub: "Escrow reversed to buyer", tone: "warning" as const };
      default:
        return { label: "Active", sub: "Transaction in progress", tone: "primary" as const };
    }
  }, [tx?.state]);

  const trustScore = useMemo(() => {
    if (!tx) return 0;
    let score = 92;
    if (tx.sellerTrustyTag) score += 2;
    if (tx.state === "FUNDED" || tx.state === "SHIPPED" || tx.state === "DELIVERED" || tx.state === "RELEASED") score += 3;
    if (tx.state === "DISPUTED") score -= 15;
    return Math.max(0, Math.min(99, score));
  }, [tx]);

  if (!tx && !loading) return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="text-3xl">🔍</div>
      <div className="mt-2 text-sm font-semibold">Transaction not found</div>
      <Link to="/buyer/transactions" className="mt-4 text-sm text-primary font-semibold">Back to activity</Link>
    </div>
  );

  const copy = async (value: string, label = "Copied") => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (typeof document !== "undefined") {
        const el = document.createElement("textarea");
        el.value = value;
        el.setAttribute("readonly", "true");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } else {
        throw new Error("Clipboard not available");
      }
      toast.success(label);
    } catch {
      toast.error("Copy failed");
    }
  };

  const hasDispute = Boolean(disputeId) || tx?.state === "DISPUTED" || tx?.state === "REFUND_PENDING" || tx?.state === "REFUNDED";
  const canOpenDispute = tx ? ["FUNDED", "SHIPPED", "DELIVERED"].includes(tx.state) : false;
  const canPay = tx?.state === "CREATED";
  const canConfirmDelivery = tx?.state === "SHIPPED";

  const onAction = async () => {
    try {
      if (!tx) return;
      if (canPay) {
        const init = await store.initializeEscrowFunding(tx.id);
        setPaymentSession({
          authorizationUrl: init.authorization_url ?? null,
          reference: init.reference,
          provider: init.provider,
          collectionStrategy: init.collectionStrategy,
          accountNumber: init.accountNumber ?? null,
          accountName: init.accountName ?? null,
          bankName: init.bankName ?? null,
          expiresAt: init.expiresAt ?? null,
        });
        setPaymentOpen(true);
        return;
      }
      if (canConfirmDelivery) {
        await store.releaseFunds(tx.id);
        toast.success("Delivery confirmed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    }
  };

  const ACTION_LABEL: Partial<Record<TxState, string>> = {
    CREATED: "Fund escrow",
    SHIPPED: "Confirm delivery",
  };
  const actionLabel = tx ? (ACTION_LABEL[tx.state] ?? "") : "";
  const actionable = Boolean(tx && (canPay || canConfirmDelivery));

  return (
    <div className="relative flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom)+12.5rem)] animate-[slide-up_0.35s_cubic-bezier(0.22,1,0.36,1)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(50,212,111,0.18)_0%,transparent_70%)] blur-2xl" />
      </div>

      <header className="relative z-10 flex items-center gap-3 px-5 pt-12">
        <Link to="/buyer/transactions" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">Active transaction</div>
          <div className="truncate font-semibold">{tx?.title ?? "Loading…"}</div>
        </div>
        {tx ? <TxStatusBadge state={tx.state} /> : <div className="h-7 w-20 rounded-full bg-muted animate-pulse" />}
      </header>

      <div className="relative z-10 px-5 pt-6">
        <div className="rounded-3xl border border-white/10 bg-card/80 p-5 shadow-[var(--shadow-elevated)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount in escrow</div>
              <div className="mt-1 text-3xl font-bold tracking-tight">{tx ? formatNGN(tx.amount) : <span className="inline-block h-9 w-40 rounded-xl bg-muted animate-pulse" />}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Protected by provider
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground/90">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> {trustScore}% Trusted
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</div>
              <div className="mt-1 text-sm font-semibold">{friendlyStatus.label}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MiniKV label="Buyer" value={tx?.buyerName ?? (loading ? "Loading…" : "—")} />
            <MiniKV label="Seller" value={tx ? `${tx.sellerName}${tx.sellerTrustyTag ? ` · ${tx.sellerTrustyTag}` : ""}` : (loading ? "Loading…" : "—")} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MiniKV
              label="Reference"
              value={tx?.reference ?? (loading ? "Loading…" : "—")}
              mono
              copyValue={tx?.reference ?? ""}
              onCopy={copy}
            />
            <MiniKV
              label="Created"
              value={tx ? new Date(tx.createdAt).toLocaleString() : (loading ? "Loading…" : "—")}
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <GlassSection title="Progress">
            {tx ? (
              <div className="rounded-2xl border border-border bg-card p-4">
                <TxTimeline state={tx.state} />
              </div>
            ) : (
              <div className="h-28 rounded-2xl bg-muted animate-pulse" />
            )}
          </GlassSection>

          <GlassSection title="Activity log">
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                No events yet
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((e, idx) => (
                  <div key={`${e.type}-${e.createdAt}-${idx}`} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{e.title}</div>
                        {e.description ? <div className="mt-0.5 text-xs text-muted-foreground">{e.description}</div> : null}
                      </div>
                      <div className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassSection>

          <GlassSection title="Trust & Security">
            <div className="grid grid-cols-1 gap-2">
              <Indicator icon={<BadgeCheck className="h-4 w-4" />} label="Verified Seller" value={tx?.sellerTrustyTag ? "Passed" : "Pending"} status={tx?.sellerTrustyTag ? "passed" : "pending"} />
              <Indicator icon={<Lock className="h-4 w-4" />} label="Session verified" value={Boolean(session)} status="passed" />
              <Indicator icon={<ShieldCheck className="h-4 w-4" />} label="Escrow Protection Active" value={tx && tx.state !== "CREATED" ? "Active" : "Inactive"} status={tx && tx.state !== "CREATED" ? "active" : "pending"} />
            </div>
          </GlassSection>

          <GlassSection title="Dispute Center">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="text-sm font-semibold">Disputes freeze escrow release</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Only upload verifiable evidence. All actions are logged.
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {hasDispute ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!tx) return;
                      navigate({ to: "/buyer/disputes/$id", params: { id: tx.id } });
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-semibold tap-scale"
                  >
                    <AlertTriangle className="h-4 w-4" /> View dispute
                  </button>
                ) : null}
                {!hasDispute && canOpenDispute ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!tx) return;
                      try {
                        await store.advanceTx(tx.id, "DISPUTED");
                        store.fetchDisputeByTransaction(tx.id).then((d: any) => setDisputeId(d?.id ?? tx.id)).catch(() => null);
                        toast.success("Dispute opened");
                        navigate({ to: "/buyer/disputes/$id", params: { id: tx.id } });
                      } catch (e: any) {
                        toast.error(e?.message || "Failed to open dispute");
                      }
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm font-semibold text-destructive tap-scale"
                  >
                    <AlertTriangle className="h-4 w-4" /> Open dispute
                  </button>
                ) : null}
              </div>
            </div>
          </GlassSection>
        </div>
      </div>

      {actionable ? (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-1/2 z-30 w-[min(440px,calc(100vw-1.5rem))] -translate-x-1/2 px-3">
          <div className="rounded-3xl border border-white/10 bg-card/85 p-2 shadow-[var(--shadow-elevated)] backdrop-blur-xl">
            <button
              type="button"
              onClick={onAction}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
            >
              <ShieldCheck className="h-4 w-4" />
              {actionLabel}
            </button>
          </div>
        </div>
      ) : null}

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        authorizationUrl={paymentSession?.authorizationUrl ?? null}
        amountLabel={tx ? formatNGN(tx.amount) : ""}
        paymentProvider={paymentSession?.provider ?? null}
        collectionStrategy={paymentSession?.collectionStrategy ?? null}
        accountNumber={paymentSession?.accountNumber ?? null}
        accountName={paymentSession?.accountName ?? null}
        bankName={paymentSession?.bankName ?? null}
        expiresAt={paymentSession?.expiresAt ?? null}
        paymentReference={paymentSession?.reference ?? null}
        onVerify={async () => {
          if (!paymentSession?.reference) throw new Error("Missing payment reference");
          return store.verifyEscrowFunding(id, paymentSession.reference);
        }}
        pollPaid={async () => {
          const latest = await store.refreshTransaction(id);
          return Boolean(latest && latest.state !== "CREATED");
        }}
        onPaid={() => toast.success("Payment confirmed")}
      />
    </div>
  );
}

function GlassSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 first:mt-0">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="rounded-3xl border border-border bg-card/80 p-4 backdrop-blur-xl">{children}</div>
    </section>
  );
}

function MiniKV({
  label,
  value,
  mono,
  wrap,
  copyValue,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
  copyValue?: string;
  onCopy?: (value: string, label?: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        {copyValue && onCopy ? (
          <button
            type="button"
            onClick={() => onCopy(copyValue, `${label} copied`)}
            className="inline-flex h-6 items-center gap-1 rounded-lg border border-border bg-muted px-2 text-[10px] font-semibold text-foreground/90 tap-scale"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        ) : null}
      </div>
      <div
        className={[
          "mt-1 text-sm font-semibold leading-snug",
          mono ? "font-mono text-[12px] tracking-tight text-foreground/95" : "",
          wrap ? "whitespace-normal break-all" : "truncate",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function Indicator({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | boolean;
  status: "passed" | "pending" | "active";
}) {
  const tone = status === "passed" ? "bg-success/15 text-success" : status === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold">{label}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{typeof value === "boolean" ? (value ? "Yes" : "No") : value}</div>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>{status}</span>
    </div>
  );
}
