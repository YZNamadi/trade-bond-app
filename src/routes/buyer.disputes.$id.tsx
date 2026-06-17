import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle, ShieldCheck, Upload, FileText, MessageSquare } from "lucide-react";
import { formatNGN, store, useStore } from "@/lib/mock-store";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/buyer/disputes/$id")({
  component: BuyerDispute,
});

function BuyerDispute() {
  const { id } = Route.useParams();
  const tx = useStore((s) => s.transactions.find((t) => t.id === id));
  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<any>(null);
  const [note, setNote] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const apiBase = useMemo(() => {
    const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
    const raw = envUrl ? envUrl.replace(/\/$/, "") : "";
    if (!raw) return "/api";
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      store.refreshTransaction(id),
      store.fetchDisputeByTransaction(id).then((d) => { if (alive) setDispute(d); }),
    ])
      .catch(() => null)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (!tx) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6">
        <div className="text-sm font-semibold">Dispute not found</div>
        <Link to="/buyer/transactions" className="mt-4 text-sm text-primary font-semibold">
          Back to activity
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <header className="flex items-center gap-3">
        <Link to="/buyer/transactions/$id" params={{ id }} className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Dispute</div>
          <div className="text-xl font-bold">{tx.reference}</div>
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-destructive">{dispute ? `Status: ${dispute.status}` : "Dispute status"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              This transaction is locked while the dispute is being handled. Avoid sharing sensitive info.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Summary</div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Amount</div>
            <div className="font-semibold">{formatNGN(tx.amount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Seller</div>
            <div className="font-semibold">{tx.sellerName}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground">Item</div>
            <div className="font-semibold">{tx.title}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">What happens next</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Submit evidence and notes. Admin review decisions are logged with request IDs and tamper-evident hashes.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidence</div>
        {!dispute ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No dispute found for this transaction yet.
          </div>
        ) : (
          <>
            <label className="mt-3 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-card font-semibold tap-scale">
              <Upload className="h-4 w-4" /> Upload evidence
              <input
                type="file"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploadBusy(true);
                  try {
                    await store.uploadDisputeEvidence(dispute.id, file);
                    const d = await store.fetchDisputeByTransaction(id);
                    setDispute(d);
                    toast.success("Evidence uploaded");
                  } catch (err: any) {
                    toast.error(err?.message || "Upload failed");
                  } finally {
                    setUploadBusy(false);
                  }
                }}
                disabled={uploadBusy}
              />
            </label>

            <div className="mt-3 space-y-2">
              {(dispute.evidence || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No evidence uploaded yet
                </div>
              ) : (
                (dispute.evidence || []).map((ev: any) => (
                  <a
                    key={ev.id}
                    href={`${apiBase}/disputes/${dispute.id}/evidence/${ev.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 tap-scale"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="truncate">{ev.originalFileName}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {ev.mimeType} · {(ev.size / 1024 / 1024).toFixed(2)} MB · {new Date(ev.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">
                      {ev.uploadedByRole}
                    </span>
                  </a>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {dispute ? (
        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</div>
          <div className="mt-2 rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Add a clear note (no card details, OTPs, or secrets)…"
              className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <button
            onClick={async () => {
              if (!note.trim()) return toast.error("Enter a note");
              setNoteBusy(true);
              try {
                await store.addDisputeNote(dispute.id, note.trim());
                const d = await store.fetchDisputeByTransaction(id);
                setDispute(d);
                setNote("");
                toast.success("Note added");
              } catch (err: any) {
                toast.error(err?.message || "Failed to add note");
              } finally {
                setNoteBusy(false);
              }
            }}
            disabled={noteBusy}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
          >
            <MessageSquare className="h-4 w-4" /> Add note
          </button>
        </div>
      ) : null}

      {loading ? null : dispute ? (
        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Audit trail</div>
          <div className="mt-3 space-y-2">
            {(dispute.events || []).slice(-30).reverse().map((ev: any) => (
              <div key={ev.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{ev.type}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {ev.actorRole || "system"} · {new Date(ev.createdAt).toLocaleString()} · {ev.requestId ? `req ${String(ev.requestId).slice(0, 8)}…` : "no req"}
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px] font-semibold text-muted-foreground">#{ev.seq}</div>
                </div>
                {String(ev.type || "").toUpperCase() === "NOTE_ADDED" ? (
                  <div className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {typeof ev?.after?.text === "string" ? ev.after.text : ""}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
