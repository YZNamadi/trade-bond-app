"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, Check, Copy, Landmark } from "lucide-react";
import { toast } from "sonner";

export function PaymentDialog({
  open,
  onOpenChange,
  authorizationUrl,
  amountLabel,
  paymentProvider,
  collectionStrategy,
  accountNumber,
  accountName,
  bankName,
  expiresAt,
  paymentReference,
  onVerify,
  pollPaid,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorizationUrl: string | null;
  amountLabel: string;
  paymentProvider?: string | null;
  collectionStrategy?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  bankName?: string | null;
  expiresAt?: string | null;
  paymentReference?: string | null;
  onVerify: () => Promise<boolean>;
  pollPaid?: () => Promise<boolean>;
  onPaid?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [paid, setPaid] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const autoVerifyTimeoutRef = useRef<number | null>(null);
  const autoVerifyIntervalRef = useRef<number | null>(null);

  const url = useMemo(() => authorizationUrl, [authorizationUrl]);
  const transferMode = !url && Boolean(accountNumber);
  const expiryLabel = useMemo(() => {
    if (!expiresAt) return null;
    const parsed = Date.parse(expiresAt);
    if (!Number.isFinite(parsed)) return expiresAt;
    return new Date(parsed).toLocaleString();
  }, [expiresAt]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Copy failed");
    }
  };

  useEffect(() => {
    if (!open) return;
    setElapsed(0);
    setPaid(false);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!pollPaid) return;
    let stopped = false;
    const t = setInterval(() => {
      pollPaid()
        .then((ok) => {
          if (stopped) return;
          if (!ok) return;
          setPaid(true);
          try {
            onPaid?.();
          } catch {}
          setTimeout(() => {
            if (stopped) return;
            onOpenChange(false);
          }, 700);
        })
        .catch(() => null);
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [open, pollPaid, onPaid, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    if (!url) return;
    if (paid) return;
    if (autoVerifyTimeoutRef.current) window.clearTimeout(autoVerifyTimeoutRef.current);
    if (autoVerifyIntervalRef.current) window.clearInterval(autoVerifyIntervalRef.current);

    let stopped = false;
    let attempts = 0;
    const maxAttempts = 20;
    autoVerifyTimeoutRef.current = window.setTimeout(() => {
      autoVerifyIntervalRef.current = window.setInterval(() => {
        if (stopped) return;
        if (paid) return;
        if (verifying) return;
        attempts += 1;
        if (attempts > maxAttempts) {
          if (autoVerifyIntervalRef.current) window.clearInterval(autoVerifyIntervalRef.current);
          autoVerifyIntervalRef.current = null;
          return;
        }
        setVerifying(true);
        onVerify()
          .then((confirmed) => {
            if (stopped) return;
            if (!confirmed) return;
            setPaid(true);
            try {
              onPaid?.();
            } catch {}
            window.setTimeout(() => {
              if (stopped) return;
              onOpenChange(false);
            }, 700);
          })
          .catch(() => null);
      }, 3500);
    }, 6000);
    return () => {
      stopped = true;
      if (autoVerifyTimeoutRef.current) window.clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
      if (autoVerifyIntervalRef.current) window.clearInterval(autoVerifyIntervalRef.current);
      autoVerifyIntervalRef.current = null;
    };
  }, [open, url, onVerify, onPaid, onOpenChange, paid, verifying]);

  useEffect(() => {
    if (!open) return;
    if (!verifying) return;
    const t = window.setTimeout(() => setVerifying(false), 2500);
    return () => window.clearTimeout(t);
  }, [open, verifying]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-[420px] flex-col overflow-hidden rounded-3xl p-0">
        <div className="px-5 pt-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              Secure payment
            </DialogTitle>
            <DialogDescription>
              Funds are securely held by the payment provider until the transaction is completed.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">{amountLabel}</span>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 bg-muted/30">
          {paid ? (
            <div className="flex h-[520px] w-full flex-col items-center justify-center gap-3 bg-background text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <div className="text-lg font-bold">Payment confirmed</div>
              <div className="text-sm text-muted-foreground">Updating transaction status…</div>
            </div>
          ) : url ? (
            <div>
              <iframe
                title="Paystack checkout"
                src={url}
                className="h-[calc(92dvh-212px)] min-h-[420px] w-full bg-background"
                allow="payment"
              />
              <div className="px-5 py-3 text-xs text-muted-foreground">
                If checkout doesn’t load,{" "}
                <button
                  type="button"
                  className="font-semibold text-primary tap-scale"
                  onClick={() => {
                    try {
                      window.open(url, "_blank", "noopener,noreferrer");
                    } catch {}
                  }}
                >
                  open it in a new tab
                </button>
                .
              </div>
            </div>
          ) : transferMode ? (
            <div className="p-5">
              <div className="rounded-3xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Transfer to fund escrow</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {paymentProvider ? `${paymentProvider.toUpperCase()} ` : ""}generated bank details for this escrow.
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <TransferField label="Bank" value={bankName || "Anchor bank"} onCopy={bankName ? () => copy(bankName, "Bank copied") : undefined} />
                  <TransferField label="Account number" value={accountNumber || "—"} onCopy={accountNumber ? () => copy(accountNumber, "Account number copied") : undefined} mono />
                  <TransferField label="Account name" value={accountName || "TrustyTrade escrow"} onCopy={accountName ? () => copy(accountName, "Account name copied") : undefined} />
                  {paymentReference ? (
                    <TransferField label="Reference" value={paymentReference} onCopy={() => copy(paymentReference, "Reference copied")} mono />
                  ) : null}
                  {collectionStrategy ? (
                    <TransferField label="Collection mode" value={collectionStrategy.replace(/_/g, " ")} />
                  ) : null}
                  {expiryLabel ? (
                    <TransferField label="Expires" value={expiryLabel} />
                  ) : null}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                Transfer the exact amount shown above. Verification may take a few moments after the bank marks the payment as received.
              </div>
            </div>
          ) : (
            <div className="flex h-[520px] w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm">
              <div className="font-semibold text-foreground">Checkout not available</div>
              <div className="text-muted-foreground">
                The payment provider didn’t return payment instructions. Please try again.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-4 border-t border-border bg-card/80 backdrop-blur-xl">
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 flex-1 rounded-2xl border border-border bg-background font-semibold tap-scale"
            >
              Cancel
            </button>
            <div className="shrink-0 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
              {paid ? "Confirmed" : verifying ? `Confirming… (${elapsed}s)` : `Waiting… (${elapsed}s)`}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferField({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-7 items-center gap-1 rounded-xl border border-border bg-background px-2 text-[10px] font-semibold tap-scale"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        ) : null}
      </div>
      <div className={`mt-1 break-all text-sm font-semibold ${mono ? "font-mono tracking-tight" : ""}`}>{value}</div>
    </div>
  );
}
