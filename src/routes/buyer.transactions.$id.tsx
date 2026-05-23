import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, MessageCircle, AlertTriangle } from "lucide-react";
import { formatNGN, store, useStore } from "@/lib/mock-store";
import { TxStatusBadge } from "@/components/TxStatusBadge";
import { TxTimeline } from "@/components/TxTimeline";
import { toast } from "sonner";

export const Route = createFileRoute("/buyer/transactions/$id")({
  component: TxDetails,
});

function TxDetails() {
  const { id } = Route.useParams();
  const tx = useStore((s) => s.transactions.find((t) => t.id === id));

  if (!tx) return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="text-3xl">🔍</div>
      <div className="mt-2 text-sm font-semibold">Transaction not found</div>
      <Link to="/buyer/transactions" className="mt-4 text-sm text-primary font-semibold">Back to activity</Link>
    </div>
  );

  const onAction = () => {
    switch (tx.state) {
      case "CREATED": store.fundEscrow(tx.id); toast.success("Escrow funded"); break;
      case "DELIVERED": store.releaseFunds(tx.id); toast.success("Funds released to seller"); break;
      case "SHIPPED": store.advanceTx(tx.id, "DELIVERED"); toast.success("Delivery confirmed"); break;
      default: break;
    }
  };

  const actionLabel = {
    CREATED: "Fund escrow",
    FUNDED: "Awaiting shipment",
    SHIPPED: "Confirm delivery",
    DELIVERED: "Release funds",
    RELEASED: "Completed",
    DISPUTED: "View dispute",
    REFUNDED: "Refunded",
  }[tx.state];

  const actionable = ["CREATED", "SHIPPED", "DELIVERED"].includes(tx.state);

  return (
    <div className="flex min-h-dvh flex-col pb-6">
      <header className="flex items-center gap-3 px-5 pt-12">
        <Link to="/buyer/transactions" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Transaction</div>
          <div className="font-semibold">{tx.reference}</div>
        </div>
        <TxStatusBadge state={tx.state} />
      </header>

      <div className="px-5 pt-6">
        {/* Amount card */}
        <div className="rounded-3xl bg-[var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-glow)]">
          <div className="text-xs text-white/70">Amount in escrow</div>
          <div className="mt-1 text-3xl font-bold">{formatNGN(tx.amount)}</div>
          <div className="mt-2 flex items-center gap-1 text-xs text-white/80">
            <ShieldCheck className="h-3.5 w-3.5" /> Protected by TrustyTrade
          </div>
        </div>

        {/* Item */}
        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item</div>
          <div className="mt-2 font-semibold">{tx.title}</div>
          {tx.description && <div className="mt-1 text-sm text-muted-foreground">{tx.description}</div>}
        </section>

        {/* Participants */}
        <section className="mt-4 grid grid-cols-2 gap-2">
          <Party label="Buyer" name={tx.buyerName} />
          <Party label="Seller" name={tx.sellerName} />
        </section>

        {/* Timeline */}
        <section className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Progress</div>
          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <TxTimeline state={tx.state} />
          </div>
        </section>

        {/* Help */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold tap-scale">
            <MessageCircle className="h-4 w-4" /> Chat seller
          </button>
          <button className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive tap-scale">
            <AlertTriangle className="h-4 w-4" /> Open dispute
          </button>
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-border bg-card/80 px-5 py-4 backdrop-blur-xl">
        <button
          onClick={onAction} disabled={!actionable}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:shadow-none"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function Party({ label, name }: { label: string; name: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-primary">
          {name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
        </div>
        <div className="truncate text-sm font-semibold">{name}</div>
      </div>
    </div>
  );
}
