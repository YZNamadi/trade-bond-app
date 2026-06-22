import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, LogOut, Bell, Lock, HelpCircle, Users, Store, CreditCard, Landmark } from "lucide-react";
import { store, useStore } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/buyer/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/buyer/settings" || pathname === "/buyer/settings/";
  const navigate = useNavigate();
  const session = useStore((s) => s.session);
  const accounts = useStore((s) => s.accounts);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [desiredTrustyTag, setDesiredTrustyTag] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submittingSeller, setSubmittingSeller] = useState(false);

  if (!isIndex) return <Outlet />;

  return (
    <div className="px-5 pb-6 pt-12">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gradient-accent)] text-lg font-bold text-primary-foreground capitalize">
          {(session?.name?.[0]) ?? "G"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold capitalize">{session?.name ?? "Guest"}</div>
          <div className="truncate text-xs text-muted-foreground">{session?.email}</div>
        </div>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Buyer</span>
      </div>

      <Section title="Account">
        <Row icon={<Lock className="h-4 w-4" />} label="Security & password" href="/buyer/settings/security" />
        <Row icon={<Bell className="h-4 w-4" />} label="Notifications" href="/buyer/settings/notifications" />
        <Row icon={<Landmark className="h-4 w-4" />} label="Refund bank account" href="/buyer/settings/bank-accounts" />
      </Section>

      <Section title="Selling">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Become a seller</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Submit your seller onboarding request with the bank details needed for payouts.
              </div>
            </div>
          </div>
          {showSellerForm ? (
            <div className="mt-4 space-y-3">
              <InlineField label="Desired TrustyTag" value={desiredTrustyTag} onChange={setDesiredTrustyTag} placeholder="@techhaven.ng" />
              <InlineField label="Bank name" value={bankName} onChange={setBankName} placeholder="Access Bank" />
              <InlineField label="Account number" value={accountNumber} onChange={setAccountNumber} placeholder="0123456789" icon={<CreditCard className="h-4 w-4" />} />
              <InlineField label="Account name" value={accountName} onChange={setAccountName} placeholder={session?.name || "Ada Lovelace"} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSellerForm(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold tap-scale"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingSeller}
                  onClick={async () => {
                    if (!bankName || !accountNumber || !accountName) {
                      toast.error("Complete the seller onboarding form");
                      return;
                    }
                    setSubmittingSeller(true);
                    try {
                      await store.applySeller({ desiredTrustyTag, bankName, accountNumber, accountName });
                      toast.success("Seller onboarding submitted");
                      setShowSellerForm(false);
                      setDesiredTrustyTag("");
                      setBankName("");
                      setAccountNumber("");
                      setAccountName("");
                    } catch (e: any) {
                      toast.error(e?.message || "Unable to submit seller onboarding");
                    } finally {
                      setSubmittingSeller(false);
                    }
                  }}
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground tap-scale disabled:opacity-60"
                >
                  {submittingSeller ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSellerForm(true)}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-background text-sm font-semibold tap-scale"
            >
              Start seller onboarding
            </button>
          )}
        </div>
      </Section>

      <Section title="App">
        <Row icon={<Users className="h-4 w-4" />} label="Accounts" hint={`${accounts.length} active`} href="/role-select" />
        <Row icon={<HelpCircle className="h-4 w-4" />} label="Help & support" href="/buyer/settings/support" />
      </Section>

      <button
        onClick={async () => { await store.signOut(); navigate({ to: "/role-select" }); }}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 font-semibold text-destructive tap-scale"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>

      <div className="mt-6 text-center text-xs text-muted-foreground">TrustyTrade · v1.0.0</div>
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

function InlineField({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="relative rounded-2xl border border-border bg-background">
        {icon ? <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div> : null}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full bg-transparent pr-4 text-sm outline-none placeholder:text-muted-foreground/60 ${icon ? "pl-10" : "pl-4"}`}
        />
      </div>
    </label>
  );
}
