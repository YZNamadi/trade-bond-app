"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";

export function PaymentDialog({
  open,
  onOpenChange,
  authorizationUrl,
  amountLabel,
  onVerify,
  pollPaid,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorizationUrl: string | null;
  amountLabel: string;
  onVerify: () => Promise<void>;
  pollPaid?: () => Promise<boolean>;
  onPaid?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [paid, setPaid] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const autoVerifyTimeoutRef = useRef<number | null>(null);
  const autoVerifyIntervalRef = useRef<number | null>(null);

  const url = useMemo(() => authorizationUrl, [authorizationUrl]);

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
          .then(() => {
            if (stopped) return;
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
          ) : (
            <div className="flex h-[520px] w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm">
              <div className="font-semibold text-foreground">Checkout not available</div>
              <div className="text-muted-foreground">
                The payment provider didn’t return a checkout URL. Please try again.
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
