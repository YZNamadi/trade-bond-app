import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCcw, Shield, ShieldCheck, RotateCcw, Wallet } from "lucide-react";
import { toast } from "sonner";
import { TxTimeline } from "@/components/TxTimeline";
import { formatNGN } from "@/lib/mock-store";
import { store } from "@/lib/mock-store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/transactions/$id")({
  component: AdminTransactionDetail,
});

type ActionKind = "reconcile" | "retry_payout" | "retry_refund";

function AdminTransactionDetail() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t, l, m] = await Promise.all([
        store.adminGetTransaction(id),
        store.adminGetTransactionLedger(id),
        store.adminGetTransactionMessages(id),
      ]);
      setTx(t as any);
      setLedger(Array.isArray(l) ? (l as any[]) : []);
      setMessages(Array.isArray(m) ? (m as any[]) : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load transaction");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([store.adminGetTransaction(id), store.adminGetTransactionLedger(id), store.adminGetTransactionMessages(id)])
      .then(([t, l, m]) => {
        if (!alive) return;
        setTx(t as any);
        setLedger(Array.isArray(l) ? (l as any[]) : []);
        setMessages(Array.isArray(m) ? (m as any[]) : []);
      })
      .catch((err: any) => {
        if (!alive) return;
        toast.error(err?.message || "Failed to load transaction");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const canRetryPayout = useMemo(() => Boolean(tx?.payoutStatus), [tx?.payoutStatus]);
  const canRetryRefund = useMemo(() => Boolean(tx?.refundStatus), [tx?.refundStatus]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Link
                to="/admin/transactions"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Transaction</div>
                <div className="truncate text-xl font-bold tracking-tight">
                  {tx?.id ? String(tx.id).slice(0, 8).toUpperCase() : "—"}…
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {tx?.paymentReference ? `Ref ${String(tx.paymentReference)}` : "No payment reference"}
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold tap-scale"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)] lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Summary</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  {String(tx?.status || "—")}
                </span>
                {tx?.payoutStatus ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    payout {String(tx.payoutStatus)}
                  </span>
                ) : null}
                {tx?.refundStatus ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    refund {String(tx.refundStatus)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight">
                {formatNGN(typeof tx?.amount === "string" ? Number(tx.amount) : tx?.amount)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Updated {tx?.updatedAt ? new Date(tx.updatedAt).toLocaleString() : tx?.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Buyer</div>
              <div className="mt-2 text-sm font-semibold">
                {tx?.buyer?.fullName ? String(tx.buyer.fullName) : tx?.buyer?.email ? String(tx.buyer.email) : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{tx?.buyer?.email ? String(tx.buyer.email) : "—"}</div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seller</div>
              <div className="mt-2 text-sm font-semibold">
                {tx?.seller?.fullName ? String(tx.seller.fullName) : tx?.seller?.email ? String(tx.seller.email) : "—"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {tx?.seller?.trustyTag ? String(tx.seller.trustyTag) : tx?.seller?.email ? String(tx.seller.email) : "—"}
              </div>
            </div>
          </div>

          {tx?.status ? (
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Flow</div>
              <div className="mt-3">
                <TxTimeline state={String(tx.status) as any} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</div>
              <div className="mt-1 text-xs text-muted-foreground">Use when provider state is uncertain or stuck.</div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
              <Shield className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background font-semibold tap-scale disabled:opacity-60"
              onClick={() => setAction("reconcile")}
              disabled={loading || !tx}
            >
              <RotateCcw className="h-4 w-4" />
              Reconcile
            </button>
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
              onClick={() => setAction("retry_payout")}
              disabled={loading || !tx || !canRetryPayout}
            >
              <Wallet className="h-4 w-4" />
              Retry payout
            </button>
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive font-semibold tap-scale disabled:opacity-60"
              onClick={() => setAction("retry_refund")}
              disabled={loading || !tx || !canRetryRefund}
            >
              <ShieldCheck className="h-4 w-4" />
              Retry refund
            </button>

            {!canRetryPayout && tx ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                No payout status available for retry.
              </div>
            ) : null}
            {!canRetryRefund && tx ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                No refund status available for retry.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ledger</div>
        {loading ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : ledger.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No ledger entries found
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {ledger.slice(0, 200).map((e: any) => (
              <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{String(e.eventType || "event")}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {e.provider ? `Provider ${String(e.provider)}` : "Provider —"} ·{" "}
                      {e.providerRef ? `Ref ${String(e.providerRef)}` : "Ref —"} ·{" "}
                      {e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold">
                      {typeof e.amountMinor === "number" ? formatNGN(e.amountMinor / 100) : "—"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{e.currency ? String(e.currency) : "—"}</div>
                  </div>
                </div>
                {e.metadata ? (
                  <pre className="mt-2 overflow-auto rounded-2xl border border-border bg-background p-3 text-xs">
                    {JSON.stringify(e.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chat</div>
        {loading ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No messages yet
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {messages.slice(-150).map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{String(m.senderRole || "user")}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {typeof m.body === "string" ? m.body : typeof m.text === "string" ? m.text : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (busy) return;
          if (!open) setAction(null);
        }}
      >
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-[520px] flex-col overflow-hidden rounded-3xl p-0">
          <div className="px-5 pt-5">
            <DialogHeader>
              <DialogTitle>Confirm admin action</DialogTitle>
              <DialogDescription>
                {action === "reconcile"
                  ? "Reconcile will re-verify provider state and enqueue any necessary settlement jobs."
                  : action === "retry_payout"
                    ? "Retry payout enqueues a new payout verification/processing attempt."
                    : "Retry refund enqueues a new refund verification/processing attempt."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border bg-card/80 backdrop-blur-xl">
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (busy) return;
                  setAction(null);
                }}
                className="h-12 flex-1 rounded-2xl border border-border bg-background font-semibold tap-scale disabled:opacity-60"
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-12 flex-1 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
                disabled={busy}
                onClick={async () => {
                  if (!action) return;
                  setBusy(true);
                  try {
                    if (action === "reconcile") await store.adminRetrySettlement(id, "verify");
                    if (action === "retry_payout") await store.adminRetrySettlement(id, "payout");
                    if (action === "retry_refund") await store.adminRetrySettlement(id, "refund");
                    toast.success("Queued");
                    setAction(null);
                    await load();
                  } catch (err: any) {
                    toast.error(err?.message || "Action failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
