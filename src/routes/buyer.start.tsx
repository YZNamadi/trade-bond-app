import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, BadgeCheck } from "lucide-react";
import { formatNGN, store, useStore } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/buyer/start")({
  validateSearch: (s: Record<string, unknown>) => ({ sellerId: (s.sellerId as string) || "" }),
  component: StartTx,
});

const STEPS = ["Select seller", "Details", "Review", "Pay"];

function StartTx() {
  const navigate = useNavigate();
  const sellers = useStore((s) => s.sellers);
  const search = Route.useSearch();
  const [step, setStep] = useState(search.sellerId ? 1 : 0);
  const [sellerId, setSellerId] = useState(search.sellerId);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const seller = sellers.find((s) => s.id === sellerId);
  const amt = Number(amount.replace(/[^\d]/g, "")) || 0;
  const fee = Math.round(amt * 0.015);

  const next = () => {
    if (step === 0 && !sellerId) return toast.error("Pick a seller");
    if (step === 1) {
      if (!title.trim()) return toast.error("Add an item title");
      if (amt < 1000) return toast.error("Amount must be at least ₦1,000");
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => step === 0 ? navigate({ to: "/buyer" }) : setStep((s) => s - 1);

  const pay = () => {
    setPaying(true);
    setTimeout(() => {
      const tx = store.createTx({ sellerId, title, description: desc, amount: amt, category: seller?.category || "General" });
      store.fundEscrow(tx.id);
      toast.success("Payment successful");
      navigate({ to: "/buyer/transactions/$id", params: { id: tx.id } });
    }, 1600);
  };

  return (
    <div className="flex min-h-dvh flex-col pb-6">
      <header className="flex items-center gap-3 px-5 pt-12">
        <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
          <div className="font-semibold">{STEPS[step]}</div>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-5 mt-4 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="flex-1 px-5 pt-6 animate-[slide-in-right_0.3s_ease-out]" key={step}>
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold">Who are you paying?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick from your saved or trending sellers.</p>
            <div className="mt-5 space-y-2">
              {sellers.map((s) => (
                <button key={s.id} onClick={() => setSellerId(s.id)} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left tap-scale transition-all ${sellerId === s.id ? "border-primary bg-accent" : "border-border bg-card"}`}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--gradient-accent)] text-sm font-bold text-primary-foreground">{s.avatar}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-semibold"><span className="truncate">{s.name}</span>{s.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}</div>
                    <div className="text-xs text-muted-foreground">{s.category}</div>
                  </div>
                  {sellerId === s.id && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && seller && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-accent p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">{seller.avatar}</div>
              <div className="text-sm">
                <div className="font-semibold">{seller.name}</div>
                <div className="text-xs text-muted-foreground">{seller.handle}</div>
              </div>
            </div>
            <FieldText label="Item title" value={title} onChange={setTitle} placeholder="e.g. iPhone 15 Pro Max 256GB" />
            <FieldText label="Description" value={desc} onChange={setDesc} placeholder="Color, condition, delivery details…" textarea />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</label>
              <div className="relative rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground">₦</div>
                <input
                  inputMode="numeric"
                  value={amount ? Number(amount.replace(/[^\d]/g, "")).toLocaleString() : ""}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="h-14 w-full bg-transparent pl-9 pr-4 text-lg font-bold outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && seller && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">You'll pay</div>
              <div className="mt-1 text-3xl font-bold">{formatNGN(amt + fee)}</div>
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Item amount" value={formatNGN(amt)} />
                <Row label="Escrow fee (1.5%)" value={formatNGN(fee)} />
                <Row label="Seller" value={seller.name} />
                <Row label="Item" value={title} />
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-2xl bg-accent p-3 text-xs">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span className="text-muted-foreground">Your funds stay locked in escrow until you confirm delivery.</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            {paying ? (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent pulse-glow">
                  <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div className="mt-6 text-lg font-bold">Processing payment…</div>
                <div className="text-sm text-muted-foreground">Securing your funds via Paystack</div>
              </>
            ) : (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <div className="mt-6 text-lg font-bold">Ready to pay {formatNGN(amt + fee)}</div>
                <div className="text-sm text-muted-foreground">You'll be redirected to Paystack to complete payment.</div>
              </>
            )}
          </div>
        )}
      </div>

      {!paying && (
        <div className="border-t border-border bg-card/80 px-5 py-4 backdrop-blur-xl">
          <button
            onClick={step === 3 ? pay : next}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
          >
            {step === 3 ? "Pay now" : step === 2 ? "Confirm & continue" : "Continue"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function FieldText({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; textarea?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        {textarea ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="min-h-[88px] w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60" />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-14 w-full bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground/60" />
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right font-semibold">{value}</span></div>
  );
}
