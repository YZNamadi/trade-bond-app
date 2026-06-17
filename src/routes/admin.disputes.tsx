import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Scale, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/disputes")({
  component: AdminDisputes,
});

type Tab = "OPEN" | "CLOSED";

function AdminDisputes() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/admin/disputes" || pathname === "/admin/disputes/";
  const [tab, setTab] = useState<Tab>("OPEN");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  const header = useMemo(() => {
    return tab === "OPEN"
      ? { title: "Disputes", sub: "Open disputes awaiting action." }
      : { title: "Disputes", sub: "Closed disputes (terminal states)." };
  }, [tab]);

  const load = async (t: Tab) => {
    setLoading(true);
    try {
      const list = await store.adminListDisputes(t);
      setRows(Array.isArray(list) ? list : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    store.adminListDisputes(tab)
      .then((list) => {
        if (!alive) return;
        setRows(Array.isArray(list) ? list : []);
      })
      .catch((err: any) => {
        if (!alive) return;
        toast.error(err?.message || "Failed to load disputes");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tab]);

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
            onClick={() => load(tab)}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-semibold tap-scale"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["OPEN", "CLOSED"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold tap-scale transition-all ${
                tab === t ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {t === "OPEN" ? "Open" : "Closed"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Queue</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Evidence may contain sensitive information. Open files only on trusted devices.
            </div>
          </div>
          <div className="flex h-10 items-center gap-2 rounded-2xl border border-border bg-muted/20 px-3 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Actions audited
          </div>
        </div>

        {loading ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No disputes found
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {rows.map((d) => (
              <Link
                key={d.id}
                from={Route.fullPath}
                to="/admin/disputes/$id"
                params={{ id: d.id }}
                className="block rounded-2xl border border-border bg-card p-4 tap-scale hover:bg-muted/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-primary">
                        <Scale className="h-4 w-4" />
                      </span>
                      <span className="truncate">{String(d.id).slice(0, 8).toUpperCase()}…</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {String(d.status || "")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Tx {d.transactionId ? String(d.transactionId).slice(0, 8).toUpperCase() : "—"}… · Updated{" "}
                      {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-semibold text-primary">Review</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
