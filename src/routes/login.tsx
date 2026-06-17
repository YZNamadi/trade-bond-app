import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { store } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ email: (s.email as string) || "" }),
  component: Login,
});

function Login() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email || "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Fill in all fields");
    setLoading(true);
    try {
      const session = await store.login(email, password);
      toast.success("Welcome back");
      navigate({ to: session.role === "admin" ? "/admin" : session.role === "buyer" ? "/buyer" : "/seller" });
    } catch (e: any) {
      toast.error(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-12">
      <Link to="/role-select" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted tap-scale">
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="mt-8 animate-[fade-in_0.4s_ease-out]">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Log in to your buyer or seller account.</p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field icon={<Mail className="h-4 w-4" />} label="Email">
          <input
            type="email" inputMode="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-14 w-full bg-transparent pl-12 pr-4 text-base outline-none placeholder:text-muted-foreground/60"
          />
        </Field>

        <Field icon={<Lock className="h-4 w-4" />} label="Password">
          <input
            type={show ? "text" : "password"} autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-14 w-full bg-transparent pl-12 pr-12 text-base outline-none placeholder:text-muted-foreground/60"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground tap-scale">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </Field>

        <div className="flex justify-end">
          <Link to="/forgot-password" search={{ email }} className="text-sm font-medium text-primary tap-scale">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit" disabled={loading}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
        >
          {loading ? <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" />Logging in…</span> : "Log in"}
        </button>
      </form>

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-primary">Create an account</Link>
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
