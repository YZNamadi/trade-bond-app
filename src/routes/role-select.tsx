import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Plus, Check } from "lucide-react";
import { store, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/role-select")({
  component: RoleSelect,
});

function RoleSelect() {
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const accounts = useStore((s) => s.accounts);

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-14">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-sm font-semibold tracking-wide">TrustyTrade</span>
      </div>

      <div className="mt-10 animate-[fade-in_0.4s_ease-out]">
        <h1 className="text-3xl font-bold leading-tight tracking-tight">Choose an account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Switch between active accounts in this browser session.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {accounts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No accounts are active in this browser session yet.
          </div>
        ) : (
          accounts.map((a) => (
            <button
              key={a.userId}
              onClick={async () => {
                store.setActiveAccountId(a.userId);
                if (session?.userId === a.userId) {
                  navigate({ to: a.role === "admin" ? "/admin" : a.role === "buyer" ? "/buyer" : "/seller" });
                  return;
                }
                navigate({ to: "/login", search: { email: a.email } });
              }}
              className="flex w-full items-center gap-3 rounded-3xl border border-border bg-card p-4 text-left tap-scale hover:border-primary/40 transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gradient-accent)] text-sm font-bold text-primary-foreground">
                {a.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{a.name}</div>
                <div className="truncate text-xs text-muted-foreground">{a.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  {a.role}
                </span>
                {session?.userId === a.userId && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-auto pt-8">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate({ to: "/login", search: { email: "" } })}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card font-semibold tap-scale"
          >
            Log in <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate({ to: "/signup" })}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold tap-scale shadow-[var(--shadow-glow)]"
          >
            <Plus className="h-4 w-4" /> Add account
          </button>
        </div>
      </div>
    </div>
  );
}
