import { TX_FLOW, type TxState } from "@/lib/mock-store";
import { Check } from "lucide-react";

export function TxTimeline({ state }: { state: TxState }) {
  if (state === "DISPUTED" || state === "REFUNDED") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="text-sm font-semibold text-destructive">
          {state === "DISPUTED" ? "Transaction is under dispute" : "Funds were refunded"}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Our team is reviewing. You'll be notified of any updates.</p>
      </div>
    );
  }
  const currentIdx = TX_FLOW.indexOf(state);
  return (
    <div className="space-y-1">
      {TX_FLOW.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground ring-4 ring-primary/15" : "bg-muted text-muted-foreground"
              }`}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < TX_FLOW.length - 1 && (
                <div className={`mt-1 h-8 w-0.5 rounded-full ${i < currentIdx ? "bg-success" : "bg-border"}`} />
              )}
            </div>
            <div className="flex-1 pb-4 pt-1">
              <div className={`text-sm font-semibold ${active ? "text-foreground" : done ? "text-foreground/80" : "text-muted-foreground"}`}>
                {label(s)}
              </div>
              <div className="text-xs text-muted-foreground">{sub(s)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function label(s: TxState) {
  return { CREATED: "Transaction created", FUNDED: "Escrow funded", SHIPPED: "Item shipped", DELIVERED: "Item delivered", RELEASED: "Funds released" }[s] ?? s;
}
function sub(s: TxState) {
  return {
    CREATED: "Awaiting buyer payment",
    FUNDED: "Funds locked in escrow",
    SHIPPED: "Seller dispatched the item",
    DELIVERED: "Buyer to confirm receipt",
    RELEASED: "Payment sent to seller",
  }[s] ?? "";
}
