import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/seller/settings/bank-accounts")({
  component: SellerBankAccounts,
});

function SellerBankAccounts() {
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
        toast.error(e?.message || "Failed to load bank accounts");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedBankName = useMemo(() => {
    const hit = banks.find((b) => b.code === selectedBankCode);
    return hit?.name || "";
  }, [banks, selectedBankCode]);

  const add = async () => {
    if (!selectedBankCode) return toast.error("Select a bank");
    const digits = accountNumber.replace(/[^\d]/g, "");
    if (digits.length !== 10) return toast.error("Enter a valid account number");
    if (accountName.trim() && accountName.trim().length < 2) return toast.error("Enter account name");
    try {
      const res = await store.linkMyBankAccount({
        bankCode: selectedBankCode,
        accountNumber: digits,
        accountName: accountName.trim() || undefined,
      });
      setLinked(res);
      toast.success(`Linked ${selectedBankName || "bank account"}`);
      setSelectedBankCode("");
      setAccountNumber("");
      setAccountName("");
    } catch (e: any) {
      toast.error(e?.message || "Bank account linking failed");
    }
  };

  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <header className="flex items-center gap-3">
        <Link to="/seller/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Settings</div>
          <div className="text-xl font-bold">Bank accounts</div>
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">No platform wallet</div>
            <div className="mt-1 text-xs text-muted-foreground">
              TrustyTrade never holds funds. Bank details are used only for seller verification and provider payouts.
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6">
        {linked?.linked ? (
          <>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Linked bank account</h2>
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{linked.bankName || "Bank"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {linked.accountName || "Account"} • {linked.accountNumberMasked || "******"}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Add bank account</h2>
        <div className="rounded-3xl border border-border bg-card p-5">
          <BankSelect label="Bank" value={selectedBankCode} onChange={setSelectedBankCode} banks={banks} />
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Field label="Account number" value={accountNumber} onChange={setAccountNumber} placeholder="10 digits" icon={<Building2 className="h-4 w-4" />} inputMode="numeric" />
            <Field label="Account name (optional)" value={accountName} onChange={setAccountName} placeholder="Must match bank records" icon={<Building2 className="h-4 w-4" />} />
          </div>
          <button
            onClick={add}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
          >
            <Plus className="h-4 w-4" /> Add account
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
          <option value="" className="bg-background text-foreground">
            Select bank
          </option>
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
  icon,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <div className="text-muted-foreground">{icon}</div>
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
