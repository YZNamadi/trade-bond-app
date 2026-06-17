import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, LogOut, Bell, Lock, HelpCircle, BadgeCheck, Building2, Users } from "lucide-react";
import { store, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/seller/settings")({
  component: SellerSettings,
});

function SellerSettings() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/seller/settings" || pathname === "/seller/settings/";
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const accounts = useStore((s) => s.accounts);

  if (!isIndex) return <Outlet />;

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gradient-accent)] text-lg font-bold text-primary-foreground capitalize">
          {(session?.name?.[0]) ?? "S"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold capitalize">{session?.name ?? "Seller"}</div>
          <div className="truncate text-xs text-muted-foreground">{session?.email}</div>
        </div>
        <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-secondary-foreground">Seller</span>
      </div>

      <Section title="Business">
        <Row icon={<BadgeCheck className="h-4 w-4" />} label="Verification" hint={session?.verified ? "Verified" : "Not verified"} href="/seller/settings/verification" />
        <Row icon={<Building2 className="h-4 w-4" />} label="Bank accounts" href="/seller/settings/bank-accounts" />
      </Section>

      <Section title="Account">
        <Row icon={<Lock className="h-4 w-4" />} label="Security & password" href="/seller/settings/security" />
        <Row icon={<Bell className="h-4 w-4" />} label="Notifications" href="/seller/settings/notifications" />
      </Section>

      <Section title="App">
        <Row icon={<Users className="h-4 w-4" />} label="Accounts" hint={`${accounts.length} saved`} href="/role-select" />
        <Row icon={<HelpCircle className="h-4 w-4" />} label="Help & support" href="/seller/settings/support" />
      </Section>

      <button
        onClick={async () => { await store.signOut(); navigate({ to: "/role-select" }); }}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 font-semibold text-destructive tap-scale"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({
  icon,
  label,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  href: string;
}) {
  return (
    <a href={href} className="flex w-full items-center gap-3 p-4 text-left tap-scale hover:bg-muted/40">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">{icon}</div>
      <div className="flex-1 text-sm font-medium">{label}</div>
      {hint && <span className="text-xs font-semibold text-success">{hint}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
