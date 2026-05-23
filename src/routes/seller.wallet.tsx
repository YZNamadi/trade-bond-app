import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatNGN, timeAgo, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/seller/wallet")({
  component: SellerWallet,
});

function SellerWallet() {
  const earnings = useStore((s) => s.earningsAvailable);
  const txs = useStore((s) => s.transactions.filter((t) => t.state === "RELEASED"));

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>

      <div className="mt-5 rounded-3xl bg-[var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-glow)] relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="text-xs text-white/70">Available balance</div>
        <div className="mt-1 text-4xl font-bold tracking-tight">{formatNGN(earnings)}</div>
        <Link to="/seller/withdraw" className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-semibold text-primary tap-scale w-fit">
          <ArrowUpRight className="h-4 w-4" /> Withdraw
        </Link>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent payouts</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          {txs.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No payouts yet</div>
          ) : txs.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{tx.title}</div>
                <div className="text-xs text-muted-foreground">{timeAgo(tx.updatedAt)}</div>
              </div>
              <div className="text-sm font-bold text-success">+{formatNGN(tx.amount)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
