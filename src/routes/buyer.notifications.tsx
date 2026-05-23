import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell } from "lucide-react";
import { store, timeAgo, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/buyer/notifications")({
  component: Notifications,
});

function Notifications() {
  const notifs = useStore((s) => s.notifications);
  return (
    <div className="min-h-dvh px-5 pb-6 pt-12">
      <div className="flex items-center gap-3">
        <Link to="/buyer" className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border tap-scale">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-xl font-bold">Notifications</h1>
        <button onClick={() => store.markAllRead()} className="text-xs font-semibold text-primary tap-scale">Mark all read</button>
      </div>

      <div className="mt-6 space-y-2">
        {notifs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-2 text-sm font-semibold">No notifications yet</div>
          </div>
        ) : notifs.map((n) => (
          <div key={n.id} className={`rounded-2xl border p-4 transition-all ${n.read ? "border-border bg-card" : "border-primary/30 bg-accent"}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
              <div className="flex-1">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
