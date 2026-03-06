const DEFAULT_AUTH_REDIRECT = "/boards";

export function getCurrentAppPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function normalizeRedirectTarget(target?: string | null) {
  if (!target) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const url = new URL(target, window.location.origin);

    if (url.origin !== window.location.origin) {
      return DEFAULT_AUTH_REDIRECT;
    }

    const normalizedTarget = `${url.pathname}${url.search}${url.hash}`;
    return normalizedTarget || DEFAULT_AUTH_REDIRECT;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

export function getAuthLoginSearch(target?: string | null, forceLogin = false) {
  return {
    redirect: normalizeRedirectTarget(target),
    force: forceLogin,
  };
}
