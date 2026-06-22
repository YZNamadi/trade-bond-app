import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, User, Mail, Lock, ShoppingBag, Store as StoreIcon } from "lucide-react";
import { store, type Role } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [desiredTrustyTag, setDesiredTrustyTag] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error("Fill in all fields");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (role === "seller" && (!bankName || !accountNumber || !accountName)) {
      return toast.error("Complete the seller onboarding fields");
    }
    setLoading(true);
    try {
      const session = await store.signup({ name, email, password, role });
      if (role === "seller") {
        await store.applySeller({ desiredTrustyTag, bankName, accountNumber, accountName });
        toast.success("Account created and seller onboarding submitted");
        navigate({ to: "/buyer" });
        return;
      }
      toast.success("Account created");
      navigate({ to: session.role === "buyer" ? "/buyer" : "/seller" });
    } catch (e: any) {
      toast.error(e?.message || "Signup failed");
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
        <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every new account starts as a buyer. Choose seller if you want to submit onboarding right away.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("buyer")}
            className={`flex h-14 items-center justify-center gap-2 rounded-2xl border-2 tap-scale font-semibold ${
              role === "buyer" ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground"
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> Buyer
          </button>
          <button
            type="button"
            onClick={() => setRole("seller")}
            className={`flex h-14 items-center justify-center gap-2 rounded-2xl border-2 tap-scale font-semibold ${
              role === "seller" ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground"
            }`}
          >
            <StoreIcon className="h-4 w-4" /> Seller
          </button>
        </div>

        <Input icon={<User className="h-4 w-4" />} label="Full name" type="text" value={name} onChange={setName} placeholder="Ada Lovelace" />
        <Input icon={<Mail className="h-4 w-4" />} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Input icon={<Lock className="h-4 w-4" />} label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
        {role === "seller" ? (
          <div className="space-y-4 rounded-3xl border border-border bg-card p-4">
            <div>
              <div className="text-sm font-semibold">Seller onboarding</div>
              <div className="mt-1 text-xs text-muted-foreground">
                We submit your seller request after account creation. Approval happens before selling is enabled.
              </div>
            </div>
            <Input icon={<StoreIcon className="h-4 w-4" />} label="Desired TrustyTag" type="text" value={desiredTrustyTag} onChange={setDesiredTrustyTag} placeholder="@techhaven.ng" />
            <Input icon={<User className="h-4 w-4" />} label="Bank name" type="text" value={bankName} onChange={setBankName} placeholder="Access Bank" />
            <Input icon={<Lock className="h-4 w-4" />} label="Account number" type="text" value={accountNumber} onChange={setAccountNumber} placeholder="0123456789" />
            <Input icon={<User className="h-4 w-4" />} label="Account name" type="text" value={accountName} onChange={setAccountName} placeholder="Ada Lovelace" />
          </div>
        ) : null}

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
        <Link to="/login" search={{ email: "" }} className="font-semibold text-primary">Log in</Link>
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
