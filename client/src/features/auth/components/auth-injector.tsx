import { useAuth0 } from "@auth0/auth0-react";
import { useLayoutEffect } from "react";
import { setAuthTokenGetter } from "@/features/auth/token-provider";

export const AuthInjector = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useLayoutEffect(() => {
    if (isAuthenticated) {
      setAuthTokenGetter(async () => getAccessTokenSilently());
    } else {
      setAuthTokenGetter(async () => null);
    }
  }, [getAccessTokenSilently, isAuthenticated]);
  return null;
};
