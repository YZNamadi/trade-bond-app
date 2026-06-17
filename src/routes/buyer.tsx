import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Home, Receipt, Settings } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/buyer")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (!store.get().session) {
      await store.bootstrap();
    }
    const s = store.get().session;
    if (!s) throw redirect({ to: "/role-select" });
    if (s.role === "admin") throw redirect({ to: "/admin" });
    if (s.role !== "buyer") throw redirect({ to: "/seller" });
  },
  component: BuyerShell,
});

function BuyerShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 animate-[fade-in_0.3s_ease-out]">
        <Outlet />
      </main>
      <BottomNav
        items={[
          { to: "/buyer", label: "Home", icon: Home },
          { to: "/buyer/transactions", label: "Activity", icon: Receipt },
          { to: "/buyer/settings", label: "Settings", icon: Settings },
        ]}
      />
    </div>
  );
}
