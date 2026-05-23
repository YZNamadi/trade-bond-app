import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Plus, ShieldCheck } from "lucide-react";
import { formatNGN, timeAgo, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/buyer/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const wallet = useStore((s) => s.walletBalance);
  const escrow = useStore((s) => s.escrowLocked);
  const txs = useStore((s) => s.transactions);

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>

      <div className="mt-5 rounded-3xl bg-[var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-glow)] relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="text-xs text-white/70">Available balance</div>
        <div className="mt-1 text-4xl font-bold tracking-tight">{formatNGN(wallet)}</div>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <div className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
            <span className="text-white/70">Escrow locked:</span> <span className="font-semibold">{formatNGN(escrow)}</span>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/20 py-3 text-sm font-semibold backdrop-blur tap-scale">
            <Plus className="h-4 w-4" /> Fund
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white text-primary py-3 text-sm font-semibold tap-scale">
            <ArrowUpRight className="h-4 w-4" /> Withdraw
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Funds in escrow</div>
            <div className="text-xs text-muted-foreground">Locked until transactions complete</div>
          </div>
          <div className="text-base font-bold">{formatNGN(escrow)}</div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transaction history</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          {txs.slice(0, 6).map((tx) => {
            const out = tx.state !== "REFUNDED";
            return (
              <div key={tx.id} className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${out ? "bg-destructive/10 text-destructive" : "bg-success/15 text-success"}`}>
                  {out ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{tx.title}</div>
                  <div className="text-xs text-muted-foreground">{timeAgo(tx.updatedAt)}</div>
                </div>
                <div className={`text-sm font-bold ${out ? "" : "text-success"}`}>{out ? "-" : "+"}{formatNGN(tx.amount)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
