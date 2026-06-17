import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { formatNGN, store } from "@/lib/mock-store";
import { toast } from "sonner";
import { PaymentDialog } from "@/components/PaymentDialog";

export const Route = createFileRoute("/buyer/start")({ component: StartTx });

const STEPS = ["Enter TrustyTag", "Details", "Review", "Pay"];

function StartTx() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [trustyTag, setTrustyTag] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerHandle, setSellerHandle] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [paymentTxId, setPaymentTxId] = useState<string | null>(null);

  const seller = sellerId ? { id: sellerId, name: sellerName, handle: sellerHandle, category: "General" } : null;
  const amt = Number(amount.replace(/[^\d]/g, "")) || 0;
  const fee = Math.round(amt * 0.015);

  const next = () => {
    if (step === 0 && !sellerId) return toast.error("Enter a valid TrustyTag");
    if (step === 1) {
      if (!title.trim()) return toast.error("Add an item title");
      if (amt < 1000) return toast.error("Amount must be at least ₦1,000");
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => step === 0 ? navigate({ to: "/buyer" }) : setStep((s) => s - 1);

  const pay = async () => {
    setPaying(true);
    try {
      const tx = await store.createTx({ sellerId, title, description: desc, amount: amt, category: seller?.category || "General" });
      const init = await store.initializeEscrowFunding(tx.id);
      setPaymentTxId(tx.id);
      setPaymentUrl(init.authorization_url);
      setPaymentRef(init.reference);
      setPaymentOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
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
            <h2 className="text-xl font-bold">Enter seller TrustyTag</h2>
            <p className="mt-1 text-sm text-muted-foreground">You’ll get the seller’s TrustyTag outside the app. We’ll check it here.</p>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">TrustyTag</label>
                <div className="rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <input
                    value={trustyTag}
                    onChange={(e) => setTrustyTag(e.target.value)}
                    placeholder="@techhaven.ng"
                    className="h-14 w-full bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const s = await store.lookupSellerByTrustyTag(trustyTag);
                    setSellerId(s.id);
                    setSellerName(s.name);
                    setSellerHandle(s.trustyTag || s.handle);
                    toast.success("Seller found");
                    setStep(1);
                  } catch (e: any) {
                    setSellerId("");
                    setSellerName("");
                    setSellerHandle("");
                    toast.error(e?.message || "Seller not found");
                  }
                }}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
              >
                Validate TrustyTag <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 1 && seller && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-accent p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">{sellerName ? sellerName.slice(0, 2).toUpperCase() : "S"}</div>
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
                <div className="text-sm text-muted-foreground">Complete payment in a secure in-app Paystack checkout.</div>
              </>
            )}
          </div>
        )}
      </div>

      {!paying && step !== 0 && (
        <div className="border-t border-border bg-card/80 px-5 py-4 backdrop-blur-xl">
          <button
            onClick={step === 3 ? pay : next}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
          >
            {step === 3 ? "Open secure checkout" : step === 2 ? "Confirm & continue" : "Continue"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={(o) => {
          if (!o) {
            setPaymentOpen(false);
            return;
          }
          setPaymentOpen(true);
        }}
        authorizationUrl={paymentUrl}
        amountLabel={formatNGN(amt + fee)}
        onVerify={async () => {
          if (!paymentTxId || !paymentRef) throw new Error("Missing payment session");
          await store.verifyEscrowFunding(paymentTxId, paymentRef);
        }}
        pollPaid={async () => {
          if (!paymentTxId) return false;
          const latest = await store.refreshTransaction(paymentTxId);
          return Boolean(latest && latest.state !== "CREATED");
        }}
        onPaid={() => {
          if (!paymentTxId) return;
          toast.success("Payment confirmed");
          navigate({ to: "/buyer/transactions/$id", params: { id: paymentTxId } });
        }}
      />
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
