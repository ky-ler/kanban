type TokenGetter = () => Promise<string | null>;

const tokenProvider = {
  get: (async () => null) as TokenGetter,
};

export const setAuthTokenGetter = (getter: TokenGetter) => {
  tokenProvider.get = getter;
};

export const getAuthToken = async (): Promise<string | null> => {
  return tokenProvider.get();
};
