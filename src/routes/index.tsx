import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { store } from "@/lib/mock-store";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      const session = store.get().session;
      if (!session) navigate({ to: "/role-select" });
      else if (session.role === "buyer") navigate({ to: "/buyer" });
      else navigate({ to: "/seller" });
    }, 1400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--gradient-primary)] text-primary-foreground">
      <div className="flex flex-col items-center gap-4 animate-[scale-in_0.5s_ease-out]">
        <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/15 backdrop-blur-xl ring-1 ring-white/25 pulse-glow">
          <ShieldCheck className="h-10 w-10" strokeWidth={2.4} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">TrustyTrade</h1>
          <p className="mt-1 text-sm text-white/75">Escrow for everyone</p>
        </div>
      </div>
      <div className="absolute bottom-10 flex items-center gap-2 text-xs text-white/60">
        <div className="h-1 w-1 animate-pulse rounded-full bg-white/80" />
        <span>Securing your session…</span>
      </div>
    </div>
  );
}
