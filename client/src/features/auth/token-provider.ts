type TokenGetter = () => Promise<string | null>;

const tokenProvider = {
  get: (async () => {
    throw new Error("Auth0 token provider not set");
  }) as TokenGetter,
};

export const setAuthTokenGetter = (getter: TokenGetter) => {
  tokenProvider.get = getter;
};

export const getAuthToken = async (): Promise<string | null> => {
  return tokenProvider.get();
};
