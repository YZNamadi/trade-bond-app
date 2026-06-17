import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, RefreshCcw, Scale, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/disputes/$id")({
  component: AdminDisputeDetail,
});

type Outcome = "refund" | "partial_refund" | "release" | "reject";

function apiBaseUrl() {
  const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  const raw = envUrl ? envUrl.replace(/\/$/, "") : "";
  if (!raw) return "/api";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

function AdminDisputeDetail() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<any | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("reject");
  const [justification, setJustification] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await store.adminGetDispute(id);
      setDispute(d as any);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load dispute");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    store.adminGetDispute(id)
      .then((d) => {
        if (!alive) return;
        setDispute(d as any);
      })
      .catch((err: any) => {
        if (!alive) return;
        toast.error(err?.message || "Failed to load dispute");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const isTerminal = useMemo(() => {
    const s = String(dispute?.status || "").toUpperCase();
    return (
      s === "RESOLVED_FOR_BUYER" ||
      s === "RESOLVED_FOR_SELLER" ||
      s === "PARTIAL_REFUND" ||
      s === "REJECTED" ||
      s === "CLOSED"
    );
  }, [dispute?.status]);

  const evidence = Array.isArray(dispute?.evidence) ? dispute!.evidence : [];
  const events = Array.isArray(dispute?.events) ? dispute!.events : [];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Link
                to="/admin/disputes"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Dispute</div>
                <div className="truncate text-xl font-bold tracking-tight">
                  {dispute?.id ? String(dispute.id).slice(0, 8).toUpperCase() : "—"}…
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Transaction {dispute?.transactionId ? String(dispute.transactionId).slice(0, 8).toUpperCase() : "—"}…
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
                  {String(dispute?.status || "—")}
                </span>
                <span className="text-xs text-muted-foreground">
                  Opened {dispute?.openedAt ? new Date(dispute.openedAt).toLocaleString() : "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Closed {dispute?.closedAt ? new Date(dispute.closedAt).toLocaleString() : "—"}
                </span>
              </div>
            </div>
            <div className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-muted/20 px-3 text-xs font-semibold text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Audited
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Decision</div>
            <div className="mt-2 text-sm">
              {dispute?.decision ? (
                <pre className="overflow-auto rounded-2xl border border-border bg-background p-3 text-xs">
                  {JSON.stringify(dispute.decision, null, 2)}
                </pre>
              ) : (
                <div className="text-xs text-muted-foreground">No decision recorded yet.</div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transaction snapshot</div>
            <div className="mt-2 text-sm">
              {dispute?.transactionSnapshot ? (
                <pre className="overflow-auto rounded-2xl border border-border bg-background p-3 text-xs">
                  {JSON.stringify(dispute.transactionSnapshot, null, 2)}
                </pre>
              ) : (
                <div className="text-xs text-muted-foreground">No snapshot available.</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</div>
              <div className="mt-1 text-xs text-muted-foreground">Use idempotent actions and document rationale.</div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
              <Scale className="h-5 w-5" />
            </span>
          </div>

          <button
            type="button"
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
            disabled={loading || !dispute || isTerminal}
            onClick={() => {
              setOutcome("reject");
              setJustification("");
              setRefundAmount("");
              setIdempotencyKey((globalThis as any)?.crypto?.randomUUID?.() ?? `tt_${Date.now()}_${Math.random().toString(16).slice(2)}`);
              setResolveOpen(true);
            }}
          >
            <ShieldCheck className="h-4 w-4" />
            Resolve dispute
          </button>

          {isTerminal ? (
            <div className="mt-3 rounded-2xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              This dispute is in a terminal state.
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidence</div>
        {loading ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : evidence.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No evidence uploaded
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {evidence.map((ev: any) => (
              <div key={ev.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{String(ev.originalFileName || "Evidence")}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {String(ev.mimeType || "file")} · {typeof ev.size === "number" ? `${(ev.size / 1024 / 1024).toFixed(2)} MB` : "—"} ·{" "}
                    {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : "—"}
                  </div>
                  {ev.note ? <div className="mt-2 text-xs text-muted-foreground">{String(ev.note)}</div> : null}
                </div>
                <button
                  type="button"
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-3 text-xs font-semibold tap-scale"
                  onClick={async () => {
                    try {
                      const directUrl = `${apiBaseUrl()}/disputes/admin/${id}/evidence/${ev.id}/file`;
                      const res = await fetch(directUrl, { credentials: "include" });
                      if (!res.ok) {
                        const text = await res.text().catch(() => "");
                        try {
                          const json = JSON.parse(text) as any;
                          const msg = typeof json?.message === "string" ? json.message : "";
                          throw new Error(msg || `Download failed: ${res.status}`);
                        } catch {
                          throw new Error(text || `Download failed: ${res.status}`);
                        }
                      }
                      const blob = await res.blob();
                      if (!blob || blob.size <= 0) {
                        try {
                          window.open(directUrl, "_blank", "noopener,noreferrer");
                          return;
                        } catch {}
                        throw new Error("Download failed");
                      }
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = String(ev.originalFileName || `evidence_${ev.id}`);
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (err: any) {
                      toast.error(err?.message || "Download failed");
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Audit trail</div>
        {loading ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : events.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No events recorded
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {events.slice(-80).reverse().map((ev: any) => (
              <div key={ev.id ?? `${ev.seq}_${ev.createdAt}`} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{String(ev.type || "event")}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {String(ev.actorRole || "system")} ·{" "}
                      {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : "—"} · seq {typeof ev.seq === "number" ? ev.seq : "—"}
                    </div>
                  </div>
                </div>
                {String(ev.type || "").toUpperCase() === "NOTE_ADDED" ? (
                  <div className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {typeof ev?.after?.text === "string" ? ev.after.text : ""}
                  </div>
                ) : null}
                {ev.metadata ? (
                  <pre className="mt-2 overflow-auto rounded-2xl border border-border bg-background p-3 text-xs">
                    {JSON.stringify(ev.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={resolveOpen}
        onOpenChange={(open) => {
          if (busy) return;
          setResolveOpen(open);
        }}
      >
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-[560px] flex-col overflow-hidden rounded-3xl p-0">
          <div className="px-5 pt-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                Resolve dispute
              </DialogTitle>
              <DialogDescription>All actions are audited and idempotent. Provide a clear justification.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Outcome</div>
                <div className="mt-2">
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as Outcome)}
                    className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    disabled={busy}
                  >
                    <option value="reject">Reject dispute</option>
                    <option value="release">Release funds to seller</option>
                    <option value="refund">Refund buyer</option>
                    <option value="partial_refund">Partial refund</option>
                  </select>
                </div>
              </div>

              {outcome === "partial_refund" ? (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">Refund amount (NGN)</div>
                  <div className="mt-2">
                    <input
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      inputMode="decimal"
                      placeholder="e.g. 1500.00"
                      className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      disabled={busy}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <div className="text-xs font-semibold text-muted-foreground">Justification</div>
                <div className="mt-2 rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={5}
                    placeholder="Clear, factual reason (no secrets)…"
                    className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                    disabled={busy}
                  />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Idempotency key: <span className="font-mono">{idempotencyKey.slice(0, 10)}…</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border bg-card/80 backdrop-blur-xl">
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (busy) return;
                  setResolveOpen(false);
                }}
                className="h-12 flex-1 rounded-2xl border border-border bg-background font-semibold tap-scale disabled:opacity-60"
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!dispute) return;
                  const j = justification.trim();
                  if (!j) return toast.error("Justification is required");
                  let refundAmountMinor: number | undefined = undefined;
                  if (outcome === "partial_refund") {
                    const n = Number(String(refundAmount).replace(/[^\d.]/g, ""));
                    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter a valid refund amount");
                    refundAmountMinor = Math.round(n * 100);
                  }
                  setBusy(true);
                  try {
                    await store.adminResolveDispute({
                      disputeId: dispute.id,
                      outcome,
                      justification: j,
                      refundAmountMinor,
                      currency: "NGN",
                      idempotencyKey,
                    });
                    toast.success("Dispute updated");
                    setResolveOpen(false);
                    await load();
                  } catch (err: any) {
                    toast.error(err?.message || "Resolve failed");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="h-12 flex-1 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Submitting…" : "Submit decision"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
