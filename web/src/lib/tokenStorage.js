const ACCESS_TOKEN_KEY = 'url_shortener_access_token';
const REFRESH_TOKEN_KEY = 'url_shortener_refresh_token';
const SESSION_ID_KEY = 'url_shortener_session_id';
const USER_KEY = 'url_shortener_user';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getSessionId() {
  return localStorage.getItem(SESSION_ID_KEY);
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

export function setTokens({ accessToken, refreshToken, sessionId }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (sessionId) localStorage.setItem(SESSION_ID_KEY, sessionId);
}

export function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(USER_KEY);
}
