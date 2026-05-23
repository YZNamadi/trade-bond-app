import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Building2 } from "lucide-react";
import { formatNGN, store, useStore } from "@/lib/mock-store";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/withdraw")({
  component: Withdraw,
});

const BANKS = [
  { id: "gtb", name: "GTBank", acct: "•••• 4421" },
  { id: "uba", name: "United Bank for Africa", acct: "•••• 8810" },
  { id: "kuda", name: "Kuda Microfinance", acct: "•••• 0033" },
];

const STEPS = ["Bank", "Amount", "Confirm", "Processing", "Done"];

function Withdraw() {
  const navigate = useNavigate();
  const earnings = useStore((s) => s.earningsAvailable);
  const [step, setStep] = useState(0);
  const [bank, setBank] = useState("");
  const [amount, setAmount] = useState("");

  const amt = Number(amount.replace(/[^\d]/g, "")) || 0;
  const selectedBank = BANKS.find((b) => b.id === bank);

  const next = () => {
    if (step === 0 && !bank) return toast.error("Select a bank");
    if (step === 1) {
      if (amt < 1000) return toast.error("Minimum is ₦1,000");
      if (amt > earnings) return toast.error("Amount exceeds available balance");
    }
    if (step === 2) {
      setStep(3);
      setTimeout(() => {
        store.withdraw(amt);
        setStep(4);
      }, 1800);
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="flex min-h-dvh flex-col pb-6">
      <header className="flex items-center gap-3 px-5 pt-12">
        <button onClick={() => step === 0 ? navigate({ to: "/seller/earnings" }) : step < 3 ? setStep(step - 1) : null} className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Withdraw funds</div>
          <div className="font-semibold">{STEPS[step]}</div>
        </div>
      </header>

      <div className="flex-1 px-5 pt-6 animate-[slide-in-right_0.3s_ease-out]" key={step}>
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold">Where to?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick your destination bank account.</p>
            <div className="mt-5 space-y-2">
              {BANKS.map((b) => (
                <button key={b.id} onClick={() => setBank(b.id)} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 tap-scale transition-all ${bank === b.id ? "border-primary bg-accent" : "border-border bg-card"}`}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary"><Building2 className="h-5 w-5" /></div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.acct}</div>
                  </div>
                  {bank === b.id && <Check className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold">How much?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Available: <span className="font-semibold text-foreground">{formatNGN(earnings)}</span></p>
            <div className="mt-5 rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₦</div>
                <input
                  inputMode="numeric"
                  value={amount ? Number(amount.replace(/[^\d]/g, "")).toLocaleString() : ""}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="h-20 w-full bg-transparent pl-12 pr-4 text-3xl font-bold outline-none"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[50000, 100000, earnings].map((q, i) => (
                <button key={i} onClick={() => setAmount(String(q))} className="rounded-xl border border-border bg-card py-2 text-xs font-semibold tap-scale">
                  {i === 2 ? "Max" : formatNGN(q)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedBank && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Amount</div>
              <div className="mt-1 text-3xl font-bold">{formatNGN(amt)}</div>
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-semibold">{selectedBank.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-semibold">{selectedBank.acct}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-semibold">Free</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Arrives</span><span className="font-semibold">Instant</span></div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent pulse-glow">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <div className="mt-6 text-lg font-bold">Processing withdrawal…</div>
            <div className="text-sm text-muted-foreground">Sending {formatNGN(amt)} to your bank</div>
          </div>
        )}

        {step === 4 && selectedBank && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-[scale-in_0.4s_ease-out]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-10 w-10" strokeWidth={3} />
            </div>
            <div className="mt-6 text-2xl font-bold">{formatNGN(amt)}</div>
            <div className="text-sm text-muted-foreground">sent to {selectedBank.name}</div>
            <Link to="/seller" className="mt-8 flex h-12 items-center justify-center rounded-2xl bg-primary px-8 font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]">
              Back to dashboard
            </Link>
          </div>
        )}
      </div>

      {step < 3 && (
        <div className="border-t border-border bg-card/80 px-5 py-4 backdrop-blur-xl">
          <button onClick={next} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]">
            {step === 2 ? "Confirm withdrawal" : "Continue"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
