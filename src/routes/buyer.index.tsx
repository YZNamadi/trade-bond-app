import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell, Plus, ShieldCheck, TrendingUp } from "lucide-react";
import { formatNGN, timeAgo, useStore } from "@/lib/mock-store";
import { TxStatusBadge } from "@/components/TxStatusBadge";

export const Route = createFileRoute("/buyer/")({
  component: BuyerHome,
});

function BuyerHome() {
  const session = useStore((s) => s.session);
  const wallet = useStore((s) => s.walletBalance);
  const escrow = useStore((s) => s.escrowLocked);
  const txs = useStore((s) => s.transactions);
  const active = txs.filter((t) => ["CREATED", "FUNDED", "SHIPPED", "DELIVERED"].includes(t.state));
  const recent = txs.slice(0, 4);
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <div className="px-5 pb-6 pt-12">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Welcome back</div>
          <div className="text-lg font-bold capitalize">{session?.name ?? "Guest"} 👋</div>
        </div>
        <Link to="/buyer/notifications" className="relative flex h-11 w-11 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />}
        </Link>
      </header>

      {/* Wallet preview */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-[var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-glow)] relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-secondary/30 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-white/75">
              <ShieldCheck className="h-3.5 w-3.5" /> Wallet balance
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight">{formatNGN(wallet)}</div>
          </div>
          <Link to="/buyer/wallet" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur tap-scale">
            View →
          </Link>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-xs">
          <div>
            <div className="text-white/65">In escrow</div>
            <div className="font-semibold">{formatNGN(escrow)}</div>
          </div>
          <div className="text-right">
            <div className="text-white/65">This month</div>
            <div className="font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> +12.4%</div>
          </div>
        </div>
      </div>

      {/* Quick action */}
      <Link
        to="/buyer/start"
        className="mt-4 flex items-center gap-3 rounded-2xl bg-card border border-border p-4 tap-scale hover:border-primary/40 transition-colors"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <Plus className="h-6 w-6" strokeWidth={2.4} />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Start a transaction</div>
          <div className="text-xs text-muted-foreground">Pay a seller through escrow</div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Active transactions */}
      {active.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active</h2>
            <span className="text-xs text-muted-foreground">{active.length}</span>
          </div>
          <div className="space-y-3">
            {active.slice(0, 2).map((tx) => (
              <Link key={tx.id} to="/buyer/transactions/$id" params={{ id: tx.id }} className="block rounded-2xl border border-border bg-card p-4 tap-scale">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{tx.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">with {tx.sellerName}</div>
                  </div>
                  <TxStatusBadge state={tx.state} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="text-lg font-bold">{formatNGN(tx.amount)}</div>
                  <div className="text-xs text-muted-foreground">{timeAgo(tx.updatedAt)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent activity</h2>
          <Link to="/buyer/transactions" className="text-xs font-semibold text-primary">See all</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          {recent.map((tx) => (
            <Link key={tx.id} to="/buyer/transactions/$id" params={{ id: tx.id }} className="flex items-center gap-3 p-4 tap-scale hover:bg-muted/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-primary">
                {tx.sellerName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{tx.title}</div>
                <div className="text-xs text-muted-foreground">{timeAgo(tx.updatedAt)} · {tx.reference}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{formatNGN(tx.amount)}</div>
                <TxStatusBadge state={tx.state} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
