import { stateColor, type TxState } from "@/lib/mock-store";

export function TxStatusBadge({ state }: { state: TxState }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${stateColor(state)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {state}
    </span>
  );
}
