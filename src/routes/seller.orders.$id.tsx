import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload, AlertTriangle } from "lucide-react";
import { formatNGN, store, useStore } from "@/lib/mock-store";
import { TxStatusBadge } from "@/components/TxStatusBadge";
import { TxTimeline } from "@/components/TxTimeline";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/orders/$id")({
  component: OrderDetails,
});

function OrderDetails() {
  const { id } = Route.useParams();
  const tx = useStore((s) => s.transactions.find((t) => t.id === id));

  if (!tx) return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="text-sm font-semibold">Order not found</div>
      <Link to="/seller/orders" className="mt-4 text-sm text-primary font-semibold">Back to orders</Link>
    </div>
  );

  const onAction = () => {
    switch (tx.state) {
      case "FUNDED": store.advanceTx(tx.id, "SHIPPED"); toast.success("Marked as shipped"); break;
      case "SHIPPED": toast.success("Proof uploaded"); break;
      default: break;
    }
  };

  const actionLabel = {
    CREATED: "Waiting for payment",
    FUNDED: "Mark as shipped",
    SHIPPED: "Upload delivery proof",
    DELIVERED: "Awaiting buyer confirmation",
    RELEASED: "Completed",
    DISPUTED: "Respond to dispute",
    REFUNDED: "Refunded",
  }[tx.state];

  const actionable = ["FUNDED", "SHIPPED", "DISPUTED"].includes(tx.state);

  return (
    <div className="flex min-h-dvh flex-col pb-6">
      <header className="flex items-center gap-3 px-5 pt-12">
        <Link to="/seller/orders" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Order</div>
          <div className="font-semibold">{tx.reference}</div>
        </div>
        <TxStatusBadge state={tx.state} />
      </header>

      <div className="px-5 pt-6">
        <div className="rounded-3xl bg-[var(--gradient-primary)] p-5 text-primary-foreground shadow-[var(--shadow-glow)]">
          <div className="text-xs text-white/70">You'll earn</div>
          <div className="mt-1 text-3xl font-bold">{formatNGN(Math.round(tx.amount * 0.985))}</div>
          <div className="mt-1 text-xs text-white/70">After 1.5% platform fee</div>
        </div>

        <section className="mt-5 rounded-2xl border border-border bg-card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Buyer</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-primary">
              {tx.buyerName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="text-sm font-semibold">{tx.buyerName}</div>
              <div className="text-xs text-muted-foreground">Verified buyer</div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item</div>
          <div className="mt-2 font-semibold">{tx.title}</div>
          {tx.description && <div className="mt-1 text-sm text-muted-foreground">{tx.description}</div>}
        </section>

        <section className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Progress</div>
          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <TxTimeline state={tx.state} />
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold tap-scale">
            <Upload className="h-4 w-4" /> Add proof
          </button>
          <button className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive tap-scale">
            <AlertTriangle className="h-4 w-4" /> Report issue
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
