import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Star, ShieldCheck, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/buyer/seller/$id")({
  component: SellerProfile,
});

function SellerProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const seller = useStore((s) => s.sellers.find((x) => x.id === id));
  const txs = useStore((s) => s.transactions.filter((t) => t.sellerId === id).slice(0, 5));

  if (!seller) return (
    <div className="flex min-h-dvh items-center justify-center p-6 text-sm text-muted-foreground">
      Seller not found. <Link to="/buyer/discover" className="ml-1 text-primary font-semibold">Browse all</Link>
    </div>
  );

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="relative bg-[var(--gradient-primary)] px-5 pb-12 pt-12 text-primary-foreground">
        <Link to="/buyer/discover" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-2xl font-bold backdrop-blur ring-2 ring-white/25">
            {seller.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-xl font-bold">{seller.name}</h1>
              {seller.verified && <BadgeCheck className="h-5 w-5 shrink-0" />}
            </div>
            <div className="text-sm text-white/80">{seller.handle}</div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
              <ShieldCheck className="h-3 w-3" /> Escrow protected
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-8 px-5">
        {/* Stats card */}
        <div className="grid grid-cols-3 gap-2 rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <Stat label="Rating" value={<span className="flex items-center justify-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{seller.rating}</span>} />
          <div className="border-x border-border">
            <Stat label="Reviews" value={seller.reviews.toString()} />
          </div>
          <Stat label="Deals" value={seller.completedDeals.toString()} />
        </div>

        {/* Bio */}
        <section className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About</h2>
          <p className="mt-2 text-sm leading-relaxed">{seller.bio}</p>
        </section>

        {/* Recent transactions */}
        {txs.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent transactions</h2>
            <div className="mt-3 space-y-2">
              {txs.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.reference}</div>
                  </div>
                  <div className="text-xs font-semibold text-success">{t.state}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 mt-6 border-t border-border bg-card/80 px-5 py-4 backdrop-blur-xl">
        <button
          onClick={() => navigate({ to: "/buyer/start", search: { sellerId: seller.id } })}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
        >
          Start transaction <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
