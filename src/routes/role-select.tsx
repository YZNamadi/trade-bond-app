import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Store, ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { store, type Role } from "@/lib/mock-store";

export const Route = createFileRoute("/role-select")({
  component: RoleSelect,
});

function RoleSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role | null>(null);

  const cont = () => {
    if (!selected) return;
    store.setRole(selected);
    navigate({ to: "/login", search: { role: selected } });
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-14">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-sm font-semibold tracking-wide">TrustyTrade</span>
      </div>

      <div className="mt-10 animate-[fade-in_0.4s_ease-out]">
        <h1 className="text-3xl font-bold leading-tight tracking-tight">
          How would you like to <span className="text-gradient">trade?</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick your role. You can switch later from settings.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <RoleCard
          role="buyer"
          active={selected === "buyer"}
          onClick={() => setSelected("buyer")}
          icon={<ShoppingBag className="h-6 w-6" />}
          title="I'm a Buyer"
          desc="Pay safely. Funds release only when you confirm delivery."
        />
        <RoleCard
          role="seller"
          active={selected === "seller"}
          onClick={() => setSelected("seller")}
          icon={<Store className="h-6 w-6" />}
          title="I'm a Seller"
          desc="Get paid the moment buyers confirm. No chargebacks, ever."
        />
      </div>

      <div className="mt-auto pt-8">
        <button
          disabled={!selected}
          onClick={cont}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold tap-scale shadow-[var(--shadow-glow)] transition-opacity disabled:opacity-40 disabled:shadow-none"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon, title, desc }: {
  role: Role; active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-3xl border-2 p-5 text-left tap-scale transition-all ${
        active
          ? "border-primary bg-accent shadow-[var(--shadow-elevated)]"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}>{icon}</div>
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</div>
        </div>
        <div className={`mt-1 h-5 w-5 rounded-full border-2 transition-all ${
          active ? "border-primary bg-primary" : "border-border"
        }`}>
          {active && <div className="h-full w-full scale-50 rounded-full bg-primary-foreground" />}
        </div>
      </div>
    </button>
  );
}
