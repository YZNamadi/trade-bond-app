import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (s: Record<string, unknown>) => ({ email: (s.email as string) || "" }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email || "");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedEmail) {
      toast.error("Enter your email");
      return;
    }
    setLoading(true);
    try {
      setSent(true);
      toast.success("If an account exists, you’ll receive reset instructions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-12">
      <button
        type="button"
        onClick={() => navigate({ to: "/login", search: { email: normalizedEmail } })}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted tap-scale"
        aria-label="Back to login"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mt-8 animate-[fade-in_0.4s_ease-out]">
        <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we’ll send instructions if an account exists.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field icon={<Mail className="h-4 w-4" />} label="Email">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-14 w-full bg-transparent pl-12 pr-4 text-base outline-none placeholder:text-muted-foreground/60"
            disabled={sent}
          />
        </Field>

        <button
          type="submit"
          disabled={loading || sent}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
        >
          {loading ? "Sending…" : sent ? "Email sent" : "Send reset link"}
        </button>
      </form>

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link to="/login" search={{ email: normalizedEmail }} className="font-semibold text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        {children}
      </div>
    </div>
  );
}
