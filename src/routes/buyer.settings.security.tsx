import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Shield, Smartphone, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/buyer/settings/security")({
  component: BuyerSecurity,
});

function BuyerSecurity() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const save = () => {
    if (!currentPassword || !newPassword) return toast.error("Fill all fields");
    if (newPassword.length < 8) return toast.error("Use at least 8 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    toast.message("Password change will be available in the next backend update.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <header className="flex items-center gap-3">
        <Link to="/buyer/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Settings</div>
          <div className="text-xl font-bold">Security</div>
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Account protection</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Your session is protected with httpOnly cookies and CSRF. Never share OTPs or payment codes.
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Change password</h2>
        <div className="rounded-3xl border border-border bg-card p-5">
          <Field label="Current password" value={currentPassword} onChange={setCurrentPassword} type="password" icon={<Lock className="h-4 w-4" />} />
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Field label="New password" value={newPassword} onChange={setNewPassword} type="password" icon={<KeyRound className="h-4 w-4" />} />
            <Field label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} type="password" icon={<KeyRound className="h-4 w-4" />} />
          </div>
          <button
            onClick={save}
            className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
          >
            Update password
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sessions</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          <Row
            icon={<Smartphone className="h-4 w-4" />}
            label="This device"
            hint="Active"
            onClick={() => toast.message("Session details will be available soon.")}
          />
        </div>
      </section>
    </div>
  );
}

function Row({ icon, label, hint, onClick }: { icon: React.ReactNode; label: string; hint?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left tap-scale hover:bg-muted/40">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">{icon}</div>
      <div className="flex-1 text-sm font-medium">{label}</div>
      {hint && <span className="text-xs font-semibold text-success">{hint}</span>}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <div className="text-muted-foreground">{icon}</div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-full bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

