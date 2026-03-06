import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { normalizeRedirectTarget } from "@/features/auth/auth-navigation";
import { router } from "@/lib/router";
import { Auth0Context } from "../hooks/use-auth0-context";
import { env } from "@/config/env";

export const Auth0Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Auth0Provider
      domain={env.VITE_AUTH0_DOMAIN}
      clientId={env.VITE_AUTH0_CLIENT_ID}
      onRedirectCallback={(appState) => {
        void router.navigate({
          href: normalizeRedirectTarget(
            appState?.returnTo as string | undefined,
          ),
          replace: true,
        });
        router.invalidate();
      }}
      authorizationParams={{
        redirect_uri: env.VITE_AUTH0_CALLBACK_URL,
        audience: env.VITE_AUTH0_AUDIENCE,
        scope: "openid profile email",
      }}
    >
      <Auth0ContextProvider>{children}</Auth0ContextProvider>
    </Auth0Provider>
  );
};

function Auth0ContextProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth0();
  return <Auth0Context.Provider value={auth}>{children}</Auth0Context.Provider>;
}
