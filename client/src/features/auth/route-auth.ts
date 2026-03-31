import { redirect } from "@tanstack/react-router";
import { ApiError } from "@/features/auth/api-error";
import {
  getAuthLoginSearch,
  getCurrentAppPath,
  normalizeRedirectTarget,
} from "@/features/auth/auth-navigation";

export function isUnauthorizedApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export function isForbiddenApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403;
}

export async function redirectToAuthLogin(
  target = getCurrentAppPath(),
  forceLogin = true,
) {
  const { router } = await import("@/lib/router");
  return router.navigate({
    to: "/auth/login",
    search: getAuthLoginSearch(normalizeRedirectTarget(target), forceLogin),
  });
}

export function handleMutationAuthError(
  error: unknown,
  target = getCurrentAppPath(),
) {
  if (!isUnauthorizedApiError(error)) {
    return false;
  }

  void redirectToAuthLogin(target, true);
  return true;
}

export function rethrowProtectedRouteError(
  error: unknown,
  target: string,
): never {
  if (isUnauthorizedApiError(error)) {
    throw redirect({
      to: "/auth/login",
      search: getAuthLoginSearch(normalizeRedirectTarget(target), true),
    });
  }

  if (isForbiddenApiError(error)) {
    throw redirect({ to: "/boards", search: { archive: undefined } });
  }

  throw error;
}
