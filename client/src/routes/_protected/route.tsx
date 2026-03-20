import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected")({
  beforeLoad: ({ context, location, preload }) => {
    if (preload) {
      return;
    }

    if (!context.auth?.isLoading && !context.auth?.isAuthenticated) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: `${location.pathname}${location.searchStr}${location.hash}`,
          force: undefined,
        },
      });
    }
  },
  component: () => <Outlet />,
});
