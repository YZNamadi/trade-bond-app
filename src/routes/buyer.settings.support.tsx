import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HelpCircle, MessageCircle, ShieldAlert, Bug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/buyer/settings/support")({
  component: BuyerSupport,
});

function BuyerSupport() {
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");

  const submit = () => {
    if (!message.trim()) return toast.error("Describe the issue");
    toast.message("Support submission will be connected in the next backend update.");
    setMessage("");
    setReference("");
  };

  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <header className="flex items-center gap-3">
        <Link to="/buyer/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Settings</div>
          <div className="text-xl font-bold">Help & support</div>
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Fast help</div>
            <div className="mt-1 text-xs text-muted-foreground">
              For payment issues, always include your transaction reference.
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick actions</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          <Row icon={<MessageCircle className="h-4 w-4" />} label="Contact support" onClick={() => toast.message("Support chat will be enabled soon.")} />
          <Row icon={<ShieldAlert className="h-4 w-4" />} label="Report a payment issue" onClick={() => document.getElementById("tt-support-form")?.scrollIntoView({ behavior: "smooth" })} />
          <Row icon={<Bug className="h-4 w-4" />} label="Report a bug" onClick={() => document.getElementById("tt-support-form")?.scrollIntoView({ behavior: "smooth" })} />
        </div>
      </section>

      <section className="mt-6" id="tt-support-form">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Send details</h2>
        <div className="rounded-3xl border border-border bg-card p-5">
          <Field label="Transaction reference (optional)" value={reference} onChange={setReference} placeholder="TRX-..." />
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</div>
            <div className="rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Tell us what happened, and what you expected…"
                className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <button
            onClick={submit}
            className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
          >
            Submit
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left tap-scale hover:bg-muted/40">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">{icon}</div>
      <div className="flex-1 text-sm font-medium">{label}</div>
    </button>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-14 w-full bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}

