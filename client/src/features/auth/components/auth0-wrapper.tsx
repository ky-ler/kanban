import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { Auth0Context } from "../hooks/use-auth0-context";

export const Auth0Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
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
