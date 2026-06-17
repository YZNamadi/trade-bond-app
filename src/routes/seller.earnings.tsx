import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import { formatNGN, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/seller/earnings")({
  component: Earnings,
});

function Earnings() {
  const completed = useStore((s) => (Array.isArray(s.transactions) ? s.transactions : []).filter((t) => t?.state === "RELEASED"));
  const totalEarned = completed.reduce((acc, t) => acc + (Number.isFinite(Number(t.amount)) ? Number(t.amount) : 0), 0);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfDay = (ts: number) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const todayStart = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = todayStart - (6 - i) * dayMs;
    return { start, end: start + dayMs };
  });
  const dayLabel = (start: number) => new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(start));

  const last7 = days.map((d) => {
    const sum = completed.reduce((acc, t) => {
      const ts = Number.isFinite(Number(t.updatedAt)) ? Number(t.updatedAt) : Number(t.createdAt);
      if (!Number.isFinite(ts)) return acc;
      if (ts >= d.start && ts < d.end) {
        return acc + (Number.isFinite(Number(t.amount)) ? Number(t.amount) : 0);
      }
      return acc;
    }, 0);
    return { ...d, sum };
  });
  const max = Math.max(0, ...last7.map((d) => d.sum));
  const total7 = last7.reduce((acc, d) => acc + d.sum, 0);

  const prevStart = todayStart - 13 * dayMs;
  const prevEnd = todayStart - 6 * dayMs;
  const prev7 = completed.reduce((acc, t) => {
    const ts = Number.isFinite(Number(t.updatedAt)) ? Number(t.updatedAt) : Number(t.createdAt);
    if (!Number.isFinite(ts)) return acc;
    if (ts >= prevStart && ts < prevEnd) {
      return acc + (Number.isFinite(Number(t.amount)) ? Number(t.amount) : 0);
    }
    return acc;
  }, 0);
  const pct = prev7 > 0 ? ((total7 - prev7) / prev7) * 100 : total7 > 0 ? 100 : 0;
  const pctLabel = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>

      <div className="mt-5 rounded-3xl bg-[var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-glow)] relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/30 blur-2xl" />
        <div className="text-xs text-white/70 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Total earnings</div>
        <div className="mt-1 text-4xl font-bold tracking-tight">{formatNGN(totalEarned)}</div>
        <div className="mt-1 text-xs text-white/80">{completed.length} completed transactions</div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground">Last 7 days</span>
          <span className={`font-bold ${pct >= 0 ? "text-success" : "text-destructive"}`}>{pctLabel}</span>
        </div>
        <div className="mt-3 flex h-24 items-end gap-1.5">
          {last7.map((d, i) => {
            const h = max > 0 ? Math.round((d.sum / max) * 100) : 0;
            const height = d.sum > 0 ? Math.max(6, h) : 2;
            return (
              <div
                key={d.start}
                title={`${dayLabel(d.start)} • ${formatNGN(d.sum)}`}
                className={`flex-1 rounded-t-lg transition-all ${d.sum > 0 ? "bg-[var(--gradient-accent)] hover:opacity-80" : "bg-border"}`}
                style={{ height: `${height}%`, animation: `slide-up 0.5s ease-out ${i * 60}ms both` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          {last7.map((d) => (
            <span key={d.start}>{dayLabel(d.start).slice(0, 1)}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Total</span>
          <span className="font-semibold text-foreground/80">{formatNGN(total7)}</span>
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
                <div className="text-sm font-bold text-success">+{formatNGN(Number.isFinite(Number(tx.amount)) ? Number(tx.amount) : 0)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
