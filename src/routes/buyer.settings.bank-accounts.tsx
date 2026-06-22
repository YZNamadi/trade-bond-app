import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Landmark, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/buyer/settings/bank-accounts")({
  component: BuyerBankAccounts,
});

function BuyerBankAccounts() {
  const [banks, setBanks] = useState<Array<{ name: string; code: string; slug: string | null }>>([]);
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [linked, setLinked] = useState<{
    linked: boolean;
    bankName: string | null;
    bankCode: string | null;
    accountName: string | null;
    accountNumberMasked: string | null;
    verifiedAt: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, a] = await Promise.all([store.listBanks(), store.fetchMyBankAccount()]);
        if (cancelled) return;
        setBanks(b || []);
        setLinked(a || null);
      } catch (e: any) {
        if (cancelled) return;
        toast.error(e?.message || "Failed to load refund bank details");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBankName = useMemo(() => {
    return banks.find((b) => b.code === selectedBankCode)?.name || "";
  }, [banks, selectedBankCode]);

  const save = async () => {
    if (!selectedBankCode) return toast.error("Select a bank");
    const digits = accountNumber.replace(/[^\d]/g, "");
    if (digits.length !== 10) return toast.error("Enter a valid account number");
    try {
      const res = await store.linkMyBankAccount({
        bankCode: selectedBankCode,
        accountNumber: digits,
        accountName: accountName.trim() || undefined,
      });
      setLinked(res);
      setSelectedBankCode("");
      setAccountNumber("");
      setAccountName("");
      toast.success(`Saved ${selectedBankName || "bank account"} for refunds`);
    } catch (e: any) {
      toast.error(e?.message || "Unable to save refund bank account");
    }
  };

  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <header className="flex items-center gap-3">
        <Link to="/buyer/settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Settings</div>
          <div className="text-xl font-bold">Refund bank account</div>
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Buyer refund destination</div>
            <div className="mt-1 text-xs text-muted-foreground">
              If a dispute is resolved in your favor, this verified bank account is used for Anchor bank-transfer refunds.
            </div>
          </div>
        </div>
      </div>

      {linked?.linked ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Current refund bank account</h2>
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{linked.bankName || "Bank"}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {linked.accountName || "Account"} · {linked.accountNumberMasked || "******"}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Add refund bank account</h2>
        <div className="rounded-3xl border border-border bg-card p-5">
          <BankSelect label="Bank" value={selectedBankCode} onChange={setSelectedBankCode} banks={banks} />
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Field label="Account number" value={accountNumber} onChange={setAccountNumber} placeholder="10 digits" inputMode="numeric" />
            <Field label="Account name (optional)" value={accountName} onChange={setAccountName} placeholder="Must match bank records" />
          </div>
          <button
            onClick={save}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
          >
            <Plus className="h-4 w-4" /> Save refund account
          </button>
        </div>
      </section>
    </div>
  );
}

function BankSelect({
  label,
  value,
  onChange,
  banks,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  banks: Array<{ name: string; code: string; slug: string | null }>;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <div className="text-muted-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-full bg-card text-sm text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value="" className="bg-background text-foreground">Select bank</option>
          {banks.map((b) => (
            <option key={`${b.code}-${b.slug ?? b.name}`} value={b.code} className="bg-background text-foreground">
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <div className="text-muted-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <input
          value={value}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}
