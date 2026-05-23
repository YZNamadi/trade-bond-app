import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { formatNGN, timeAgo, useStore, type TxState } from "@/lib/mock-store";
import { TxStatusBadge } from "@/components/TxStatusBadge";

export const Route = createFileRoute("/seller/orders")({
  component: Orders,
});

const TABS: { label: string; states: TxState[] | null }[] = [
  { label: "All", states: null },
  { label: "Pending ship", states: ["FUNDED"] },
  { label: "Shipped", states: ["SHIPPED", "DELIVERED"] },
  { label: "Completed", states: ["RELEASED"] },
];

function Orders() {
  const txs = useStore((s) => s.transactions);
  const [tab, setTab] = useState(0);
  const list = TABS[tab].states ? txs.filter((t) => TABS[tab].states!.includes(t.state)) : txs;

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">Incoming transactions from buyers.</p>

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
        {list.map((tx, i) => (
          <Link key={tx.id} to="/seller/orders/$id" params={{ id: tx.id }} className="block rounded-2xl border border-border bg-card p-4 tap-scale" style={{ animation: `fade-in 0.3s ease-out ${i * 30}ms both` }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{tx.title}</div>
                <div className="text-xs text-muted-foreground">{tx.buyerName} · {timeAgo(tx.updatedAt)}</div>
              </div>
              <TxStatusBadge state={tx.state} />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-lg font-bold">{formatNGN(tx.amount)}</div>
              <div className="text-xs text-muted-foreground">{tx.reference}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
