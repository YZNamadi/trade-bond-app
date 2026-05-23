import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Star, BadgeCheck, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/buyer/discover")({
  component: Discover,
});

const CATEGORIES = ["All", "Fashion & Apparel", "Electronics", "Sneakers", "Beauty & Skincare", "Home & Living", "Auto Parts"];

function Discover() {
  const sellers = useStore((s) => s.sellers);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(() =>
    sellers.filter((s) =>
      (cat === "All" || s.category === cat) &&
      (q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.handle.toLowerCase().includes(q.toLowerCase()))
    ), [sellers, q, cat]);

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Discover sellers</h1>
      <p className="mt-1 text-sm text-muted-foreground">Browse verified sellers across categories.</p>

      <div className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search sellers, handles…"
            className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>
        <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card tap-scale">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Categories */}
      <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c} onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold tap-scale transition-all ${
              cat === c ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="text-3xl">🔍</div>
            <div className="mt-2 text-sm font-semibold">No sellers found</div>
            <div className="text-xs text-muted-foreground">Try a different search or category.</div>
          </div>
        ) : filtered.map((s, i) => (
          <Link
            key={s.id} to="/buyer/seller/$id" params={{ id: s.id }}
            className="block rounded-2xl border border-border bg-card p-4 tap-scale hover:border-primary/40 transition-colors"
            style={{ animation: `fade-in 0.3s ease-out ${i * 30}ms both` }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--gradient-accent)] text-base font-bold text-primary-foreground">
                {s.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <div className="truncate font-semibold">{s.name}</div>
                  {s.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                </div>
                <div className="text-xs text-muted-foreground">{s.handle} · {s.category}</div>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-semibold">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {s.rating}
                  </span>
                  <span className="text-muted-foreground">{s.reviews} reviews</span>
                  <span className="text-muted-foreground">· {s.completedDeals} deals</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
