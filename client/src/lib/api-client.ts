import { ApiError } from "@/features/auth/api-error";
import { getAuthToken } from "@/features/auth/token-provider";
import { env } from "@/config/env";

const baseUrl = env.VITE_API_URL || "http://localhost:8080/";
const shouldLogDebug =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

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

const getHeaders = (headers?: HeadersInit): HeadersInit => {
  return {
    ...headers,
  };
};

interface ApiErrorResponse {
  code?: string;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const getErrorMessage = (
  response: Response,
  payload: ApiErrorResponse | string | Blob | null,
) => {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object" && "message" in payload) {
    return payload.message || `Request failed with status ${response.status}`;
  }

  return `Request failed with status ${response.status}`;
};

const createApiError = (
  response: Response,
  payload: ApiErrorResponse | string | Blob | null,
) => {
  const parsedPayload =
    payload && typeof payload === "object" && !(payload instanceof Blob)
      ? payload
      : undefined;

  return new ApiError({
    status: response.status,
    code: parsedPayload?.code,
    title: parsedPayload?.error,
    message: getErrorMessage(response, payload),
    fieldErrors: parsedPayload?.fieldErrors,
  });
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
  } catch (error) {
    if (shouldLogDebug) {
      console.debug(
        "Failed to acquire auth token, retrying without it.",
        error,
      );
    }
  }

  const requestInit: RequestInit = {
    ...options,
    headers: token
      ? { ...requestHeaders, Authorization: `Bearer ${token}` }
      : requestHeaders,
  };

  const request = new Request(requestUrl, requestInit);
  const response = await fetch(request);
  const data = await getBody<unknown>(response);

  if (!response.ok) {
    throw createApiError(
      response,
      data as ApiErrorResponse | string | Blob | null,
    );
  }

  return { status: response.status, data, headers: response.headers } as T;
};
