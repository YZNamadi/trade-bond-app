import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center animate-[fade-in_0.4s_ease-out]">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-3xl">🔍</div>
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The screen you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground tap-scale shadow-[var(--shadow-glow)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-3xl">⚠️</div>
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="h-12 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground tap-scale"
          >
            Try again
          </button>
          <a href="/" className="h-12 rounded-2xl border border-border bg-card px-6 text-sm font-semibold tap-scale flex items-center">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#6C5CE7" },
      { title: "TrustyTrade — Escrow for everyone" },
      { name: "description", content: "Secure escrow marketplace for buyers and sellers. Trade with confidence." },
      { property: "og:title", content: "TrustyTrade — Escrow for everyone" },
      { property: "og:description", content: "Secure escrow marketplace for buyers and sellers." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto min-h-dvh w-full max-w-[440px] bg-background text-foreground">
        <Outlet />
      </div>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
