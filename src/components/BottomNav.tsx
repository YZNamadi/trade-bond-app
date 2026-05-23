import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-30 mt-auto border-t border-border bg-card/90 backdrop-blur-xl pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="grid grid-cols-5 gap-1 px-2">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/buyer" && item.to !== "/seller" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 rounded-xl py-1.5 tap-scale"
            >
              <div className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-all ${active ? "bg-accent" : ""}`}>
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={active ? 2.4 : 2} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
