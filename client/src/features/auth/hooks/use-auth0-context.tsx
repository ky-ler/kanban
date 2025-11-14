import { type Auth0ContextInterface } from "@auth0/auth0-react";
import { createContext, useContext } from "react";

export const Auth0Context = createContext<Auth0ContextInterface | undefined>(
  undefined,
);

export function useAuth0Context() {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error("useAuth0Context must be used within an Auth0Wrapper");
  }
  return context;
}
