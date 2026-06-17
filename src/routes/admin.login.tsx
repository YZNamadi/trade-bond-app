import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { store } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    email: (s.email as string) || "",
    next: (s.next as string) || "/admin",
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    await store.bootstrap();
    const s = store.get().session;
    if (s?.role === "admin") throw redirect({ to: "/admin" });
  },
  component: AdminLogin,
});

function AdminLogin() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(search.email || "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    const raw = String(search.next || "/admin");
    if (raw.startsWith("http://") || raw.startsWith("https://")) return "/admin";
    if (!raw.startsWith("/")) return "/admin";
    if (!raw.startsWith("/admin")) return "/admin";
    return raw;
  }, [search.next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Fill in all fields");
    setLoading(true);
    try {
      const session = await store.login(email, password);
      if (session.role !== "admin") {
        await store.signOut();
        toast.error("This account is not authorized for admin access");
        return;
      }
      toast.success("Admin session secured");
      navigate({ to: nextPath as any });
    } catch (e: any) {
      toast.error(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-8 pt-12">
      <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted tap-scale">
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="mt-6 max-w-md animate-[fade-in_0.35s_ease-out]">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-wide">TrustyTrade Admin</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin access is restricted. All actions are audited.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 w-full max-w-md space-y-4">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)]">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              className="w-full bg-transparent text-sm outline-none"
              autoComplete="username"
              inputMode="email"
            />
          </div>

          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="••••••••"
              className="w-full bg-transparent text-sm outline-none"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="rounded-xl p-1 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-primary-foreground font-semibold tap-scale disabled:opacity-60 shadow-[var(--shadow-glow)]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
