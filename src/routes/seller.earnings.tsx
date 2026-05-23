import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { formatNGN, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/seller/earnings")({
  component: Earnings,
});

function Earnings() {
  const earnings = useStore((s) => s.earningsAvailable);
  const completed = useStore((s) => s.transactions.filter((t) => t.state === "RELEASED"));
  const totalEarned = completed.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>

      <div className="mt-5 rounded-3xl bg-[var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-glow)] relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/30 blur-2xl" />
        <div className="text-xs text-white/70 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Total earnings</div>
        <div className="mt-1 text-4xl font-bold tracking-tight">{formatNGN(totalEarned)}</div>
        <div className="mt-1 text-xs text-white/80">{completed.length} completed transactions</div>
        <Link to="/seller/withdraw" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-primary tap-scale">
          <ArrowUpRight className="h-4 w-4" /> Withdraw {formatNGN(earnings)}
        </Link>
      </div>

      {/* Chart placeholder */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground">Last 7 days</span>
          <span className="font-bold text-success">+18.2%</span>
        </div>
        <div className="mt-3 flex h-24 items-end gap-1.5">
          {[35, 52, 41, 68, 75, 58, 89].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-lg bg-[var(--gradient-accent)] transition-all hover:opacity-80" style={{ height: `${h}%`, animation: `slide-up 0.5s ease-out ${i * 60}ms both` }} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          {["M","T","W","T","F","S","S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed transactions</h2>
        {completed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No completed deals yet</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
            {completed.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{tx.title}</div>
                  <div className="text-xs text-muted-foreground">{tx.buyerName}</div>
                </div>
                <div className="text-sm font-bold text-success">+{formatNGN(tx.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
