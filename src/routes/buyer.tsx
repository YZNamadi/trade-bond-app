import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Home, Compass, Receipt, Wallet, Settings } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/buyer")({
  beforeLoad: () => {
    const s = store.get().session;
    if (!s) throw redirect({ to: "/role-select" });
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
          { to: "/buyer/discover", label: "Discover", icon: Compass },
          { to: "/buyer/transactions", label: "Activity", icon: Receipt },
          { to: "/buyer/wallet", label: "Wallet", icon: Wallet },
          { to: "/buyer/settings", label: "Settings", icon: Settings },
        ]}
      />
    </div>
  );
}
