import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import "@/index.css";
import { router } from "@/lib/router";
import { Auth0Wrapper } from "@/features/auth/components/auth0-wrapper";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { ThemeProvider } from "./features/theme/components/theme-provider";
import { LoadingSpinner } from "./components/loading-spinner";
import { queryClient } from "@/lib/router";
import { AuthInjector } from "./features/auth/components/auth-injector";

// eslint-disable-next-line react-refresh/only-export-components
function InnerApp() {
  const auth = useAuth0Context();

  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <RouterProvider router={router} context={{ auth }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auth0Wrapper>
      <QueryClientProvider client={queryClient}>
        <AuthInjector />
        <ThemeProvider defaultTheme="system" storageKey="ui-theme">
          <InnerApp />
        </ThemeProvider>
      </QueryClientProvider>
    </Auth0Wrapper>
  </StrictMode>,
);
