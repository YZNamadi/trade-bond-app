import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Package, TrendingUp, Wallet, Settings } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { store } from "@/lib/mock-store";

export const Route = createFileRoute("/seller")({
  beforeLoad: () => {
    const s = store.get().session;
    if (!s) throw redirect({ to: "/role-select" });
    if (s.role !== "seller") throw redirect({ to: "/buyer" });
  },
  component: SellerShell,
});

function SellerShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 animate-[fade-in_0.3s_ease-out]">
        <Outlet />
      </main>
      <BottomNav
        items={[
          { to: "/seller", label: "Home", icon: LayoutDashboard },
          { to: "/seller/orders", label: "Orders", icon: Package },
          { to: "/seller/earnings", label: "Earnings", icon: TrendingUp },
          { to: "/seller/wallet", label: "Wallet", icon: Wallet },
          { to: "/seller/settings", label: "Settings", icon: Settings },
        ]}
      />
    </div>
  );
}
