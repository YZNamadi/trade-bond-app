import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/buyer/seller/$id")({
  component: SellerProfile,
});

function SellerProfile() {
  return (
    <div className="flex min-h-dvh flex-col px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Seller profiles aren’t browseable in V1</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use the seller’s TrustyTag to validate the seller before creating an escrow trade.</p>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">TrustyTag validation</div>
            <div className="mt-1 text-xs text-muted-foreground">Use the seller’s TrustyTag to start a trade.</div>
          </div>
        </div>
      </div>

      <Link
        to="/buyer/start"
        search={{ sellerId: "" }}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
      >
        Start New Trade <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
