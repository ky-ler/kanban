import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { setAuthTokenGetter } from "@/features/auth/token-provider";

export const AuthInjector = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      setAuthTokenGetter(getAccessTokenSilently);
    } else {
      setAuthTokenGetter(async () => {
        throw new Error("User is not authenticated.");
      });
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  return null;
};
