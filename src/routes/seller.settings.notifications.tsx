import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/seller/settings/notifications")({
  component: SellerNotificationSettings,
});

function SellerNotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [disputeAlerts, setDisputeAlerts] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("tt:notif:seller");
    if (!raw) return;
    try {
      const v = JSON.parse(raw) as any;
      if (typeof v.pushEnabled === "boolean") setPushEnabled(v.pushEnabled);
      if (typeof v.emailEnabled === "boolean") setEmailEnabled(v.emailEnabled);
      if (typeof v.orderUpdates === "boolean") setOrderUpdates(v.orderUpdates);
      if (typeof v.disputeAlerts === "boolean") setDisputeAlerts(v.disputeAlerts);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "tt:notif:seller",
      JSON.stringify({ pushEnabled, emailEnabled, orderUpdates, disputeAlerts }),
    );
  }, [pushEnabled, emailEnabled, orderUpdates, disputeAlerts]);

  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <header className="flex items-center gap-3">
        <Link to="/seller/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Settings</div>
          <div className="text-xl font-bold">Notifications</div>
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Never miss an order</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Keep order and dispute alerts on so you can respond quickly.
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivery</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          <ToggleRow icon={<Bell className="h-4 w-4" />} label="Push notifications" value={pushEnabled} onChange={setPushEnabled} />
          <ToggleRow icon={<Bell className="h-4 w-4" />} label="Email notifications" value={emailEnabled} onChange={setEmailEnabled} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Types</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          <ToggleRow icon={<ShieldCheck className="h-4 w-4" />} label="Order updates" value={orderUpdates} onChange={setOrderUpdates} />
          <ToggleRow icon={<ShieldCheck className="h-4 w-4" />} label="Dispute alerts" value={disputeAlerts} onChange={setDisputeAlerts} />
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center gap-3 p-4 text-left tap-scale hover:bg-muted/40"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">{icon}</div>
      <div className="flex-1 text-sm font-medium">{label}</div>
      <div
        className={`h-7 w-12 rounded-full border transition-all ${
          value ? "border-primary/30 bg-primary/30" : "border-border bg-background"
        }`}
      >
        <div
          className={`h-6 w-6 rounded-full bg-white/80 shadow transition-all ${
            value ? "translate-x-5 bg-primary" : "translate-x-0.5 bg-muted-foreground/40"
          }`}
        />
      </div>
    </button>
  );
}

