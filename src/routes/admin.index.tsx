import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, Scale, Activity, ActivitySquare } from "lucide-react";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function Card({
  title,
  value,
  sub,
  to,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub: string;
  to: string;
  icon: any;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)] transition-all hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary transition-all group-hover:scale-[1.03]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ onboarding: number; disputes: number; settlement: number }>({
    onboarding: 0,
    disputes: 0,
    settlement: 0,
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([store.adminStats()])
      .then((res) => {
        const v = res[0].status === "fulfilled" ? res[0].value : null;
        if (alive && v) setStats(v as any);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const view = useMemo(() => {
    if (loading) {
      return {
        onboarding: "—",
        disputes: "—",
        settlement: "—",
      };
    }
    return {
      onboarding: stats.onboarding.toString(),
      disputes: stats.disputes.toString(),
      settlement: stats.settlement.toString(),
    };
  }, [loading, stats]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-[var(--gradient-primary)] p-6 text-primary-foreground shadow-[var(--shadow-glow)]">
        <div className="flex items-center gap-2 text-white/85">
          <ShieldCheck className="h-4 w-4" />
          <div className="text-xs font-semibold tracking-wide">Operational controls</div>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">Risk & Operations</div>
        <div className="mt-1 text-sm text-white/80">
          Review onboarding, disputes, and settlement workflows. Actions are audited.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card title="Seller onboarding" value={view.onboarding} sub="Pending reviews" to="/admin/seller-onboarding" icon={Users} />
        <Card title="Disputes" value={view.disputes} sub="Open or awaiting action" to="/admin/disputes" icon={Scale} />
        <Card title="Settlement" value={view.settlement} sub="Pending provider confirmation" to="/admin/transactions" icon={Activity} />
        <Card title="Reconciliation" value="Live" sub="Provider events and money movements" to="/admin/reconciliation" icon={ActivitySquare} />
      </div>
    </div>
  );
}
