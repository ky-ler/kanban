import { lazy, Suspense } from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import type { RouterContext } from "@/lib/router";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorPage } from "@/components/error-page";

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    );

const ReactQueryDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    );

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        name: "description",
        content: "A real-time, collaborative project management application.",
      },
      {
        title: "Velora",
      },
    ],
  }),
  component: () => <RootComponent />,
  errorComponent: RootErrorComponent,
});

function RootComponent() {
  const { auth } = Route.useRouteContext();
  const showHeader = auth.isAuthenticated || auth?.isLoading;

  return (
    <RootLayout showHeader={showHeader}>
      <Outlet />
    </RootLayout>
  );
}

function RootErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const { auth } = Route.useRouteContext();
  const isAuthenticated = auth.isAuthenticated;

  return (
    <RootLayout showHeader={isAuthenticated} isErrorMode>
      <ErrorPage
        error={error}
        reset={reset}
        isAuthenticated={isAuthenticated}
      />
    </RootLayout>
  );
}

function RootLayout({
  children,
  showHeader,
  isErrorMode = false,
}: {
  children: React.ReactNode;
  showHeader: boolean;
  isErrorMode?: boolean;
}) {
  return (
    <>
      <HeadContent />
      <TooltipProvider>
        <div className="flex min-h-svh flex-col">
          {showHeader ? <AppHeader isErrorMode={isErrorMode} /> : null}
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
        <Toaster position="bottom-center" />
        <Suspense>
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-right" />
        </Suspense>
      </TooltipProvider>
    </>
  );
}
