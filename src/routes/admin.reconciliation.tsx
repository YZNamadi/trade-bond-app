import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ActivitySquare, RefreshCcw, ShieldCheck, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { formatNGN, store } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/reconciliation")({
  component: AdminReconciliation,
});

function AdminReconciliation() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [overview, setOverview] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [o, m, e, r] = await Promise.all([
        store.adminGetReconciliationOverview("anchor"),
        store.adminListMoneyMovements({ provider: "anchor", take: 40 }),
        store.adminListProviderEvents({ provider: "anchor", take: 40 }),
        store.adminListReconciliationRuns({ provider: "anchor", take: 20 }),
      ]);
      setOverview(o);
      setMovements(Array.isArray(m) ? m : []);
      setEvents(Array.isArray(e) ? e : []);
      setRuns(Array.isArray(r) ? r : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load reconciliation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Admin</div>
            <div className="text-xl font-bold tracking-tight">Reconciliation</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Review Anchor provider events, money movements, and recent operational reconciliation runs.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              className="flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold tap-scale"
              disabled={loading || running}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={async () => {
                setRunning(true);
                try {
                  await store.adminRunReconciliation("anchor");
                  toast.success("Reconciliation run queued");
                  await load();
                } catch (err: any) {
                  toast.error(err?.message || "Failed to start reconciliation");
                } finally {
                  setRunning(false);
                }
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
              disabled={loading || running}
            >
              <Waypoints className="h-4 w-4" />
              {running ? "Running..." : "Run now"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Metric title="Pending movements" value={String(overview?.pendingMovements ?? "—")} />
        <Metric title="Failed movements" value={String(overview?.failedMovements ?? "—")} />
        <Metric title="Unprocessed events" value={String(overview?.unprocessedEvents ?? "—")} />
        <Metric title="Latest run" value={overview?.latestRun?.status ? String(overview.latestRun.status) : "—"} />
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Money movements</div>
            <div className="mt-1 text-xs text-muted-foreground">Recent Anchor payins, payouts, refunds, and transfer states.</div>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
            <ActivitySquare className="h-5 w-5" />
          </span>
        </div>
        <DataState loading={loading} empty={!movements.length} emptyLabel="No money movements found">
          <div className="mt-3 space-y-2">
            {movements.map((row) => (
              <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{row.kind}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{row.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.reference} · {row.providerObjectType || "provider object"} · {row.providerObjectId || "—"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold">{formatNGN((Number(row.amountMinor) || 0) / 100)}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataState>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Provider events</div>
              <div className="mt-1 text-xs text-muted-foreground">Recent Anchor webhook events and processing state.</div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </div>
          <DataState loading={loading} empty={!events.length} emptyLabel="No provider events found">
            <div className="mt-3 space-y-2">
              {events.map((row) => (
                <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-sm font-semibold">{row.eventType}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.providerEventId} · {row.resourceType || "resource"} · {row.resourceId || "—"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-bold uppercase">
                      {row.signatureVerified ? "signature ok" : "signature unknown"}
                    </span>
                    <span>{row.processedAt ? "processed" : "pending"}</span>
                  </div>
                </div>
              ))}
            </div>
          </DataState>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reconciliation runs</div>
              <div className="mt-1 text-xs text-muted-foreground">Recent manual or scheduled control-plane runs.</div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
              <Waypoints className="h-5 w-5" />
            </span>
          </div>
          <DataState loading={loading} empty={!runs.length} emptyLabel="No reconciliation runs found">
            <div className="mt-3 space-y-2">
              {runs.map((row) => (
                <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{row.runType}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Findings {row.findingsCount} · mismatch {formatNGN((Number(row.mismatchAmountMinor) || 0) / 100)}
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          </DataState>
        </section>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function DataState({
  loading,
  empty,
  emptyLabel,
  children,
}: {
  loading: boolean;
  empty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (empty) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return <>{children}</>;
}
