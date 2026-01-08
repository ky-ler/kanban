// import Axios, { type AxiosRequestConfig } from "axios";
import { getAuthToken } from "@/features/auth/token-provider";
import { env } from "@/config/env";
import { queryClient, router } from "./router";

const baseUrl = env.VITE_API_URL || "http://localhost:8080/";

// NOTE: Supports cases where `content-type` is other than `json`
const getBody = <T>(c: Response | Request): Promise<T> => {
  const contentType = c.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    return c.json();
  }

  if (contentType && contentType.includes("application/pdf")) {
    return c.blob() as Promise<T>;
  }

  return c.text() as Promise<T>;
};

// NOTE: Add headers
const getHeaders = (headers?: HeadersInit): HeadersInit => {
  return {
    ...headers,
  };
};

export const apiClient = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const requestUrl = `${baseUrl}${url}`;
  const requestHeaders = getHeaders(options.headers);

  let token: string | null = null;
  try {
    token = await getAuthToken();
  } catch {
    console.debug(
      "No auth token available, proceeding without authentication.",
    );
  }

  const requestInit: RequestInit = {
    ...options,
    headers: token
      ? { ...requestHeaders, Authorization: `Bearer ${token}` }
      : requestHeaders,
  };

  const request = new Request(requestUrl, requestInit);
  const response = await fetch(request);
  const data = await getBody<T>(response);

  if (response.status === 401) {
    // Backend returned 401 - authentication required but missing/invalid
    // This is different from not having a token (which is OK for public endpoints)
    handleAuthError();
  } else if (response.status === 403) {
    // Invalidate only board-related queries, not the entire cache
    // Using predicate to match query keys starting with /boards
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith("/boards");
      },
    });
    router.navigate({
      to: "/",
      search: { redirect: window.location.pathname },
    });

    throw new Error("User is not authorized to access this resource");
  } else if (!response.ok) {
    throw new Error(`API error: ${response.status} ${data}`);
  }

  return { status: response.status, data } as T;
};

const handleAuthError = () => {
  // Clear cache entirely on auth failure - user needs to re-authenticate
  // Using clear() instead of invalidateQueries() to avoid triggering refetches
  queryClient.clear();
  router.options.context.auth.logout();
  router.navigate({ to: "/", search: { redirect: window.location.pathname } });

  throw new Error("User is not authenticated!");
};
