import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, User, Mail, Lock } from "lucide-react";
import { store, type Role } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({ role: (s.role as Role) || "buyer" }),
  component: Signup,
});

function Signup() {
  const { role } = Route.useSearch();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error("Fill in all fields");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    setTimeout(() => {
      store.setSession({ email, name, role });
      toast.success("Account created");
      navigate({ to: role === "buyer" ? "/buyer" : "/seller" });
    }, 900);
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-12">
      <Link to="/role-select" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted tap-scale">
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="mt-8 animate-[fade-in_0.4s_ease-out]">
        <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign up as a <span className="font-semibold capitalize text-primary">{role}</span> to get started.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Input icon={<User className="h-4 w-4" />} label="Full name" type="text" value={name} onChange={setName} placeholder="Ada Lovelace" />
        <Input icon={<Mail className="h-4 w-4" />} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Input icon={<Lock className="h-4 w-4" />} label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />

        <button
          type="submit" disabled={loading}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)] disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          By signing up you agree to our Terms and Privacy.
        </p>
      </form>

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" search={{ role }} className="font-semibold text-primary">Log in</Link>
      </p>
    </div>
  );
}

function Input({ icon, label, type, value, onChange, placeholder }: { icon: React.ReactNode; label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="h-14 w-full bg-transparent pl-12 pr-4 text-base outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}
