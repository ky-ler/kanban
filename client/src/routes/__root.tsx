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
        content: "A real-time, collaborative kanban board application.",
      },
      {
        title: "Kanban",
      },
    ],
  }),
  component: () => <RootComponent />,
  errorComponent: ({ error, reset }) => (
    <ErrorPage error={error} reset={reset} />
  ),
});

function RootComponent() {
  const { auth } = Route.useRouteContext();

  if (!auth?.isAuthenticated && !auth?.isLoading) {
    return (
      <>
        <HeadContent />
        <TooltipProvider>
          <Outlet />
          <Toaster position="bottom-center" />
          <Suspense>
            <TanStackRouterDevtools position="bottom-right" />
            <ReactQueryDevtools buttonPosition="bottom-right" />
          </Suspense>
        </TooltipProvider>
      </>
    );
  }

  return (
    <>
      <HeadContent />
      <TooltipProvider>
        <div className="flex min-h-svh flex-col">
          <AppHeader />
          <main className="flex flex-1 flex-col">
            <Outlet />
          </main>
        </div>
        <Toaster position="bottom-center" />
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-right" />
      </TooltipProvider>
    </>
  );
}
