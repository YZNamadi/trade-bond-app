import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Shield, Scale, Users, LogOut, ActivitySquare } from "lucide-react";
import { store, useStore } from "@/lib/mock-store";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const pathname =
      typeof (location as any)?.pathname === "string"
        ? String((location as any).pathname)
        : typeof (location as any)?.href === "string"
          ? new URL(String((location as any).href), "http://local").pathname
          : "/admin";
    if (pathname.startsWith("/admin/login")) return;

    if (typeof window === "undefined") {
      const next = typeof (location as any)?.href === "string" ? (location as any).href : "/admin";
      throw redirect({ to: "/admin/login", search: { email: "", next } as any });
    }
    await store.bootstrap();
    const s = store.get().session;
    if (!s) throw redirect({ to: "/admin/login", search: { email: "", next: location.href } as any });
    if (s.role !== "admin") throw redirect({ to: s.role === "buyer" ? "/buyer" : "/seller" });
  },
  component: AdminShell,
});

function NavLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-all ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

function AdminShell() {
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (pathname.startsWith("/admin/login")) return;
    (async () => {
      await store.bootstrap();
      const s = store.get().session;
      if (!s) {
        navigate({ to: "/admin/login", search: { email: "", next: "/admin" } as any, replace: true });
        return;
      }
      if (s.role !== "admin") {
        navigate({ to: s.role === "buyer" ? "/buyer" : "/seller", replace: true });
      }
    })();
  }, [navigate, pathname]);

  if (pathname.startsWith("/admin/login")) {
    return <Outlet />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl gap-5 px-4 pb-10 pt-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)]">
            <div className="flex items-center gap-2 px-2 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight">TrustyTrade</div>
                <div className="text-[11px] text-muted-foreground">Admin Console</div>
              </div>
            </div>

            <div className="space-y-1">
              <NavLink to="/admin" icon={LayoutDashboard} label="Dashboard" />
              <NavLink to="/admin/seller-onboarding" icon={Users} label="Seller onboarding" />
              <NavLink to="/admin/disputes" icon={Scale} label="Disputes" />
              <NavLink to="/admin/transactions" icon={Shield} label="Transactions" />
              <NavLink to="/admin/reconciliation" icon={ActivitySquare} label="Reconciliation" />
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <button
                onClick={async () => {
                  await store.signOut();
                  navigate({ to: "/admin/login", search: { email: "", next: "/admin" } });
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm font-semibold text-destructive tap-scale"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
              <div className="mt-3 px-2 text-[11px] text-muted-foreground">
                {session?.email ? (
                  <>
                    Signed in as <span className="font-semibold text-foreground">{session.email}</span>
                  </>
                ) : (
                  <>
                    Signed in as <span className="font-semibold text-foreground">Not signed in</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">TrustyTrade</div>
              <div className="truncate text-xl font-bold tracking-tight">Admin Console</div>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                to="/admin"
                className="flex h-10 items-center justify-center rounded-full bg-card border border-border px-4 text-xs font-semibold"
              >
                Home
              </Link>
              <button
                onClick={async () => {
                  await store.signOut();
                  navigate({ to: "/admin/login", search: { email: "", next: "/admin" } });
                }}
                className="flex h-10 items-center justify-center rounded-full border border-destructive/30 bg-destructive/5 px-4 text-xs font-semibold text-destructive"
              >
                Log out
              </button>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
