const USER_KEY = 'url_shortener_user';
const AUTH_FLAG_KEY = 'url_shortener_is_authenticated';
const ACCESS_TOKEN_KEY = 'url_shortener_access_token';
const REFRESH_TOKEN_KEY = 'url_shortener_refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null;
}

export function getSessionId() {
  return null;
}

export function getUser() {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getIsAuthenticated() {
  return localStorage.getItem(AUTH_FLAG_KEY) === 'true';
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem(AUTH_FLAG_KEY, 'true');
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setUser(user, accessToken, refreshToken) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    clearTokens();
  }
}

export function clearTokens() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(AUTH_FLAG_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
