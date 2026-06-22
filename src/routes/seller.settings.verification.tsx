import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, CreditCard, Mail, ShieldCheck, Store } from "lucide-react";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/seller/settings/verification")({
  component: SellerVerification,
});

function SellerVerification() {
  const session = useStore((s) => s.session);
  const verified = Boolean(session?.verified);

  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <header className="flex items-center gap-3">
        <Link to="/seller/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Settings</div>
          <div className="text-xl font-bold">Verification</div>
        </div>
      </header>

      <div className={`mt-6 rounded-3xl border p-5 ${verified ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${verified ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${verified ? "text-success" : "text-warning"}`}>
              {verified ? "Verified seller" : "Verification pending"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Only verified sellers can receive transactions. Your TrustyTag becomes active after approval.
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Current checks</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          <Item icon={<Store className="h-4 w-4" />} label="Seller onboarding review" status={verified ? "Approved" : "Pending"} />
          <Item icon={<CreditCard className="h-4 w-4" />} label="Submitted bank details" status={verified ? "Checked" : "Required"} />
          <Item icon={<Mail className="h-4 w-4" />} label="Account email" status={verified ? "Active" : "Required"} />
          <Item icon={<ShieldCheck className="h-4 w-4" />} label="TrustyTag activation" status={verified ? "Active" : "Pending"} />
        </div>
      </section>
    </div>
  );
}

function Item({ icon, label, status }: { icon: React.ReactNode; label: string; status: string }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">{icon}</div>
      <div className="flex-1 text-sm font-medium">{label}</div>
      <div className="text-xs font-semibold text-muted-foreground">{status}</div>
    </div>
  );
}
