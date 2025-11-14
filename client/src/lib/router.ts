import { routeTree } from "@/routeTree.gen";
import type { Auth0ContextInterface } from "@auth0/auth0-react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

interface RouterContext {
  queryClient: QueryClient;
  auth: Auth0ContextInterface;
}

export const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: null as unknown as Auth0ContextInterface,
  },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export { router };
export type { RouterContext };
