import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, RefreshCcw, Search, Shield, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatNGN } from "@/lib/mock-store";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/transactions")({
  component: AdminTransactions,
});

type StatusFilter = "SETTLEMENT_PENDING" | "ALL";

function AdminTransactions() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/admin/transactions" || pathname === "/admin/transactions/";
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("SETTLEMENT_PENDING");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const debounceRef = useRef<number | null>(null);

  const header = useMemo(() => {
    return {
      title: "Transactions",
      sub: filter === "SETTLEMENT_PENDING" ? "Settlement pending provider confirmation." : "All transactions.",
    };
  }, [filter]);

  const load = async (input: { q: string; status: StatusFilter }) => {
    setLoading(true);
    try {
      const list = await store.adminListTransactions({ q: input.q.trim() || undefined, status: input.status });
      setRows(Array.isArray(list) ? list : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      load({ q, status: filter });
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, filter]);

  useEffect(() => {
    load({ q, status: filter });
  }, []);

  if (!isIndex) return <Outlet />;

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
            onClick={() => load({ q, status: filter })}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold tap-scale"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by reference, email, or ID…"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <div>
            <div className="flex h-12 items-center justify-between gap-2 rounded-2xl border border-border bg-background px-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                Filter
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as StatusFilter)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none"
              >
                <option value="SETTLEMENT_PENDING">Settlement pending</option>
                <option value="ALL">All</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Results</div>
            <div className="mt-1 text-xs text-muted-foreground">Use reconcile/retry actions only when provider state is verified.</div>
          </div>
          <div className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-muted/20 px-3 text-xs font-semibold text-muted-foreground">
            <Shield className="h-4 w-4" />
            Operational
          </div>
        </div>

        {loading ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.map((t) => (
              <Link
                key={t.id}
                from={Route.fullPath}
                to="/admin/transactions/$id"
                params={{ id: t.id }}
                className="block rounded-2xl border border-border bg-card p-4 tap-scale hover:bg-muted/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-primary">
                        <Activity className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">{String(t.id).slice(0, 8).toUpperCase()}…</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {String(t.status || "")}
                      </span>
                      {t.payoutStatus ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          payout {String(t.payoutStatus)}
                        </span>
                      ) : null}
                      {t.refundStatus ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          refund {String(t.refundStatus)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.paymentReference ? `Ref ${String(t.paymentReference)}` : "No payment ref"} · Buyer{" "}
                      {t.buyer?.email ? String(t.buyer.email) : t.buyer?.fullName ? String(t.buyer.fullName) : "—"} · Seller{" "}
                      {t.seller?.trustyTag ? String(t.seller.trustyTag) : t.seller?.email ? String(t.seller.email) : "—"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold">{formatNGN(typeof t.amount === "string" ? Number(t.amount) : t.amount)}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
