import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/orders/$id/issue")({
  component: ReportIssue,
});

function ReportIssue() {
  const { id } = Route.useParams();
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!message.trim()) return toast.error("Describe the issue");
    toast.message("Issue reporting will be enabled in the next backend update.");
    setMessage("");
  };

  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <header className="flex items-center gap-3">
        <Link to="/seller/orders/$id" params={{ id }} className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Order</div>
          <div className="text-xl font-bold">Report issue</div>
        </div>
      </header>

      <div className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-destructive">Report a problem</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Describe the issue clearly. Do not share card details or OTPs.
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Details</h2>
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="rounded-2xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="What happened? What did you try? Any tracking updates?"
              className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <button
            onClick={submit}
            className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
          >
            Submit
          </button>
        </div>
      </section>
    </div>
  );
}

