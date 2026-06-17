import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { store } from "@/lib/mock-store";
import { ArrowRight, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function StatusBar() {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-1 pt-3 text-xs text-white/90">
      <div className="font-semibold tracking-tight">9:41</div>
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-3.5 rounded-sm border border-white/50" />
        <div className="h-2.5 w-4 rounded-sm bg-white/75" />
      </div>
    </div>
  );
}

function SwipeToStart({
  disabled,
  label,
  onNext,
}: {
  disabled: boolean;
  label: string;
  onNext: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const max = 188;

  const commit = () => {
    setDragging(false);
    if (disabled) {
      setDragX(0);
      return;
    }
    if (dragX >= max * 0.75) {
      setDragX(max);
      onNext();
      return;
    }
    setDragX(0);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className="green-glow-btn relative mx-auto flex h-[58px] w-full max-w-md items-center justify-between rounded-full border border-white/10 bg-white/5 px-2 pl-4 pr-3 text-white disabled:opacity-60"
      onClick={() => {
        if (!disabled) onNext();
      }}
      onPointerUp={commit}
      onPointerCancel={commit}
      onPointerLeave={() => {
        if (dragging) commit();
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-[rgba(50,212,111,0.14)]"
          style={{ width: `${Math.min(100, (dragX / max) * 100)}%` }}
        />
      </div>

      <div className="relative z-10 flex w-10 shrink-0 items-center justify-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/10"
          style={{ transform: `translateX(${dragX}px)` }}
          onPointerDown={(e) => {
            if (disabled) return;
            setDragging(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragging || disabled) return;
            const target = e.currentTarget as HTMLElement;
            const parent = target.parentElement?.parentElement as HTMLElement | null;
            const rect = parent?.getBoundingClientRect();
            if (!rect) return;
            const next = Math.max(0, Math.min(max, e.clientX - rect.left - 20));
            setDragX(next);
          }}
        >
          <ArrowRight size={18} strokeWidth={2.5} color="#fff" />
        </div>
      </div>

      <span className="relative z-10 flex-1 px-3 text-center text-[17px] font-semibold text-white/90">
        {label}
      </span>

      <span className="relative z-10 flex items-center opacity-60">
        <ChevronRight size={16} strokeWidth={2.5} />
        <ChevronRight size={16} strokeWidth={2.5} className="-ml-2" />
      </span>
    </button>
  );
}

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    store.bootstrap().finally(() => {
      const session = store.get().session;
      if (session?.role === "buyer") navigate({ to: "/buyer" });
      else if (session?.role === "seller") navigate({ to: "/seller" });
      else if (session?.role === "admin") navigate({ to: "/admin" });
      else setChecking(false);
    });
  }, [navigate]);

  return (
    <div className="neo-landing flex min-h-dvh flex-col bg-[#0B0B0B] px-6 pb-[44px] pt-4">
      <div className="neo-noise" />

      <div className="animate-glow-pulse pointer-events-none absolute left-1/2 top-[-60px] z-0 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(50,212,111,0.45)_0%,transparent_70%)]" />

      <StatusBar />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="animate-fade-in flex flex-1 items-center justify-center pt-5">
          <div className="cube-cluster">
            <div className="cube-float">
              <div className="cube-grid">
                <div className="cube cube-small" />
                <div className="cube cube-small" />
                <div className="cube cube-small" />
                <div className="cube cube-small" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-7">
          <div className="animate-fade-in-up delay-200">
            <h1 className="text-center text-[38px] font-bold leading-[1.15] tracking-[-0.5px] text-white">
              Peace of mind without worrying about your personal finances
            </h1>
          </div>

          <div className="animate-fade-in-up delay-300 flex items-center justify-center gap-2">
            <div className="h-[6px] w-6 rounded-full bg-[#32D46F]" />
            <div className="h-[6px] w-[6px] rounded-full bg-white/20" />
            <div className="h-[6px] w-[6px] rounded-full bg-white/20" />
          </div>

          <div className="animate-fade-in-up delay-400">
            <SwipeToStart
              disabled={checking}
              label={checking ? "Securing your session…" : "Swipe to get started"}
              onNext={() => navigate({ to: "/role-select" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
