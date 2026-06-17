import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCcw, User, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/seller-onboarding")({
  component: AdminSellerOnboarding,
});

type Status = "PENDING" | "APPROVED" | "REJECTED";

function AdminSellerOnboarding() {
  const [status, setStatus] = useState<Status>("PENDING");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const header = useMemo(() => {
    const map: Record<Status, { title: string; sub: string }> = {
      PENDING: { title: "Seller onboarding", sub: "Review seller verification requests." },
      APPROVED: { title: "Approved requests", sub: "Completed onboarding decisions." },
      REJECTED: { title: "Rejected requests", sub: "Requests rejected by admin." },
    };
    return map[status];
  }, [status]);

  const load = async (s: Status) => {
    setLoading(true);
    try {
      const list = await store.adminListSellerOnboarding(s);
      setRows(Array.isArray(list) ? list : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    store.adminListSellerOnboarding(status)
      .then((list) => {
        if (!alive) return;
        setRows(Array.isArray(list) ? list : []);
      })
      .catch((err: any) => {
        if (!alive) return;
        toast.error(err?.message || "Failed to load requests");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Admin</div>
            <div className="text-xl font-bold tracking-tight">{header.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{header.sub}</div>
          </div>
          <button
            type="button"
            onClick={() => load(status)}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold tap-scale"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["PENDING", "APPROVED", "REJECTED"] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold tap-scale transition-all ${
                status === s ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {s === "PENDING" ? "Pending" : s === "APPROVED" ? "Approved" : "Rejected"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requests</div>

        {loading ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No requests found
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-primary">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="truncate">{r.desiredTrustyTag ? String(r.desiredTrustyTag) : "No desired tag"}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {String(r.status || "PENDING")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Submitted {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                      {r.reviewedAt ? ` · Reviewed ${new Date(r.reviewedAt).toLocaleString()}` : ""}
                    </div>
                    {r.bankName || r.accountName || r.accountNumberLast4 ? (
                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <div className="truncate">Bank: {r.bankName ? String(r.bankName) : "—"}</div>
                        <div className="truncate">
                          Account: {r.accountName ? String(r.accountName) : "—"}
                          {r.accountNumberLast4 ? ` (****${String(r.accountNumberLast4)})` : ""}
                        </div>
                      </div>
                    ) : null}
                    {r.reviewNote ? (
                      <div className="mt-2 rounded-2xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        {String(r.reviewNote)}
                      </div>
                    ) : null}
                  </div>

                  {status === "PENDING" ? (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-xs font-semibold tap-scale"
                        onClick={() => {
                          setActive(r);
                          setMode("reject");
                          setNote("");
                        }}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                        Reject
                      </button>
                      <button
                        type="button"
                        className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-xs font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
                        onClick={() => {
                          setActive(r);
                          setMode("approve");
                          setNote("");
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(active && mode)}
        onOpenChange={(open) => {
          if (busy) return;
          if (!open) {
            setActive(null);
            setMode(null);
            setNote("");
          }
        }}
      >
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-[520px] flex-col overflow-hidden rounded-3xl p-0">
          <div className="px-5 pt-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${mode === "approve" ? "bg-accent text-primary" : "bg-destructive/15 text-destructive"}`}>
                  {mode === "approve" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </span>
                {mode === "approve" ? "Approve seller onboarding" : "Reject seller onboarding"}
              </DialogTitle>
              <DialogDescription>
                Add an internal note for audit and future reference. Avoid sensitive secrets.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Reason / justification (optional)…"
                className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                disabled={busy}
              />
            </div>
          </div>

          <DialogFooter className="px-5 py-4 border-t border-border bg-card/80 backdrop-blur-xl">
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (busy) return;
                  setActive(null);
                  setMode(null);
                  setNote("");
                }}
                className="h-12 flex-1 rounded-2xl border border-border bg-background font-semibold tap-scale disabled:opacity-60"
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!active || !mode) return;
                  setBusy(true);
                  try {
                    if (mode === "approve") {
                      await store.adminApproveSellerOnboarding(active.id, note.trim() || undefined);
                      toast.success("Approved");
                    } else {
                      await store.adminRejectSellerOnboarding(active.id, note.trim() || undefined);
                      toast.success("Rejected");
                    }
                    setActive(null);
                    setMode(null);
                    setNote("");
                    await load(status);
                  } catch (err: any) {
                    toast.error(err?.message || "Action failed");
                  } finally {
                    setBusy(false);
                  }
                }}
                className={`h-12 flex-1 rounded-2xl font-semibold tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60 ${
                  mode === "approve" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
                }`}
                disabled={busy}
              >
                {busy ? "Processing…" : mode === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
