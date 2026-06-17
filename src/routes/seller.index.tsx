import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Package, TrendingUp, Truck, ArrowRight, ShieldCheck } from "lucide-react";
import { formatNGN, timeAgo, useStore } from "@/lib/mock-store";
import { TxStatusBadge } from "@/components/TxStatusBadge";

export const Route = createFileRoute("/seller/")({
  component: SellerDashboard,
});

function SellerDashboard() {
  const session = useStore((s) => s.session);
  const txs = useStore((s) => s.transactions);
  const active = txs.filter((t) => ["FUNDED", "SHIPPED", "DELIVERED"].includes(t.state));
  const pendingShip = txs.filter((t) => t.state === "FUNDED").length;
  const releasedTotal = txs.filter((t) => t.state === "RELEASED").reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="px-5 pb-6 pt-12">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Hello,</div>
          <div className="text-lg font-bold capitalize">{session?.name ?? "Seller"} 👋</div>
        </div>
        <Link to="/seller/orders" className="flex h-11 w-11 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <Bell className="h-5 w-5" />
        </Link>
      </header>

      {/* Payout status */}
      <div className="mt-6 rounded-3xl bg-[var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-glow)] relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-secondary/30 blur-2xl" />
        <div className="text-xs text-white/70 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Released by provider</div>
        <div className="mt-1 text-3xl font-bold tracking-tight">{formatNGN(releasedTotal)}</div>
        <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
          <div className="text-xs">
            <div className="text-white/65">Active orders</div>
            <div className="text-base font-semibold">{active.length}</div>
          </div>
          <div className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur">
            Paystack
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard icon={<Package className="h-4 w-4" />} label="Pending ship" value={pendingShip.toString()} accent="warning" />
        <StatCard icon={<Truck className="h-4 w-4" />} label="In transit" value={txs.filter((t) => t.state === "SHIPPED").length.toString()} accent="primary" />
      </div>

      {/* Recent orders */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active orders</h2>
          <Link to="/seller/orders" className="text-xs font-semibold text-primary">See all <ArrowRight className="inline h-3 w-3" /></Link>
        </div>
        {active.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="text-3xl">📦</div>
            <div className="mt-2 text-sm font-semibold">No active orders</div>
          </div>
        ) : (
          <div className="space-y-3">
            {active.slice(0, 3).map((tx) => (
              <Link key={tx.id} to="/seller/orders/$id" params={{ id: tx.id }} className="block rounded-2xl border border-border bg-card p-4 tap-scale">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{tx.title}</div>
                    <div className="text-xs text-muted-foreground">From {tx.buyerName} · {timeAgo(tx.updatedAt)}</div>
                  </div>
                  <TxStatusBadge state={tx.state} />
                </div>
                <div className="mt-3 text-lg font-bold">{formatNGN(tx.amount)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "primary" | "warning" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent === "primary" ? "bg-accent text-primary" : "bg-warning/15 text-warning"}`}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
