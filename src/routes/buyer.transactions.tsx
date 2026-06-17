import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { formatNGN, timeAgo, useStore, type TxState } from "@/lib/mock-store";
import { TxStatusBadge } from "@/components/TxStatusBadge";

export const Route = createFileRoute("/buyer/transactions")({
  component: TxList,
});

const TABS: { label: string; states: TxState[] | null }[] = [
  { label: "All", states: null },
  { label: "Active", states: ["CREATED", "FUNDED", "SHIPPED", "DELIVERED"] },
  { label: "Completed", states: ["RELEASE_PENDING", "RELEASED"] },
  { label: "Issues", states: ["DISPUTED", "REFUND_PENDING", "REFUNDED"] },
];

function TxList() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/buyer/transactions" || pathname === "/buyer/transactions/";
  const txs = useStore((s) => s.transactions);
  const [tab, setTab] = useState(0);
  const filtered = isIndex ? (TABS[tab].states ? txs.filter((t) => TABS[tab].states!.includes(t.state)) : txs) : [];

  if (!isIndex) return <Outlet />;

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
      <p className="mt-1 text-sm text-muted-foreground">All your escrow activity in one place.</p>

      <div className="mt-5 -mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t, i) => (
          <button
            key={t.label} onClick={() => setTab(i)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold tap-scale transition-all ${
              tab === i ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="text-3xl">📭</div>
            <div className="mt-2 text-sm font-semibold">Nothing here yet</div>
            <div className="text-xs text-muted-foreground">Transactions you start will appear here.</div>
          </div>
        ) : filtered.map((tx, i) => (
          <Link key={tx.id} to="/buyer/transactions/$id" params={{ id: tx.id }} className="block rounded-2xl border border-border bg-card p-4 tap-scale" style={{ animation: `fade-in 0.3s ease-out ${i * 30}ms both` }}>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-primary">
                {tx.sellerName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{tx.title}</div>
                    <div className="text-xs text-muted-foreground">{tx.sellerName} · {timeAgo(tx.updatedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatNGN(tx.amount)}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <TxStatusBadge state={tx.state} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
