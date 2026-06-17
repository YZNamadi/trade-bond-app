import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { store, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/buyer/chat/$id")({
  component: BuyerChat,
});

function BuyerChat() {
  const { id } = Route.useParams();
  const [text, setText] = useState("");
  const tx = useStore((s) => s.transactions.find((t) => t.id === id));
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => {
    if (!tx) return "Transaction chat";
    return tx.title || "Transaction chat";
  }, [tx]);

  const refresh = async () => {
    setLoading(true);
    try {
      await store.refreshTransaction(id);
      const rows = await store.fetchTransactionMessages(id);
      setMessages(Array.isArray(rows) ? rows : []);
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([store.refreshTransaction(id), store.fetchTransactionMessages(id)])
      .then((res) => {
        if (!alive) return;
        const rows = res[1].status === "fulfilled" ? (res[1].value as any[]) : [];
        setMessages(Array.isArray(rows) ? rows : []);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" }), 0);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-5 pt-12">
        <Link to="/buyer/transactions/$id" params={{ id }} className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Secure chat</div>
          <div className="text-xl font-bold">{title}</div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-5 pt-6 pb-6">
        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Transaction-only messaging</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Messages are tied to this transaction and visible to buyer, seller, and admin for dispute resolution.
              </div>
              <button
                type="button"
                onClick={refresh}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-background px-4 text-xs font-semibold tap-scale"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No messages yet
            </div>
          ) : (
            messages.map((m) => {
              const mine = String(m.senderRole || "").toLowerCase() === "buyer";
              const content = typeof m.body === "string" ? m.body : typeof m.text === "string" ? m.text : "";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl border border-border px-4 py-3 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-background"
                  }`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${mine ? "text-white/80" : "text-muted-foreground"}`}>
                      {String(m.senderRole || "user")}
                      {m.createdAt ? ` · ${new Date(m.createdAt).toLocaleString()}` : ""}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words">{content}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-auto border-t border-border bg-card/80 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="button"
            onClick={async () => {
              const msg = text.trim();
              if (!msg) return;
              setBusy(true);
              try {
                await store.sendTransactionMessage(id, msg);
                setText("");
                const rows = await store.fetchTransactionMessages(id);
                setMessages(Array.isArray(rows) ? rows : []);
                window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
              } catch (err: any) {
                toast.error(err?.message || "Failed to send");
              } finally {
                setBusy(false);
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary tap-scale"
            disabled={!text.trim() || busy}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
