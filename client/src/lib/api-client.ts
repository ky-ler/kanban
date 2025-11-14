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

  const token = await getAuthToken();
  if (!token) {
    handleAuthError();
  }

  const requestInit: RequestInit = {
    ...options,
    headers: { ...requestHeaders, Authorization: `Bearer ${token}` },
  };

  const request = new Request(requestUrl, requestInit);
  const response = await fetch(request);
  const data = await getBody<T>(response);

  if (response.status === 401) {
    handleAuthError();
  } else if (response.status === 403) {
    queryClient.invalidateQueries();
    router.navigate({
      to: "/",
      search: { redirect: window.location.pathname },
    });

    throw new Error("User is not authenticated!");
  } else if (!response.ok) {
    throw new Error(`API error: ${response.status} ${data}`);
  }

  return { status: response.status, data } as T;
};

const handleAuthError = () => {
  queryClient.invalidateQueries();
  router.options.context.auth.logout();
  router.navigate({ to: "/", search: { redirect: window.location.pathname } });

  throw new Error("User is not authenticated!");
};
