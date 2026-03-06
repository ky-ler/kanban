import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { setAuthTokenGetter } from "@/features/auth/token-provider";

export const AuthInjector = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      setAuthTokenGetter(async () => getAccessTokenSilently());
    } else {
      setAuthTokenGetter(async () => null);
    }
  }, [getAccessTokenSilently, isAuthenticated]);
  return null;
};
