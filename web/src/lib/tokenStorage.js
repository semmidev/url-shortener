const USER_KEY = 'url_shortener_user';
const AUTH_FLAG_KEY = 'url_shortener_is_authenticated';

export function getAccessToken() {
  return null; // Handled by HTTP-only cookies
}

export function getRefreshToken() {
  return null; // Handled by HTTP-only cookies
}

export function getSessionId() {
  return null; // Handled by HTTP-only cookies
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

export function setTokens() {
  localStorage.setItem(AUTH_FLAG_KEY, 'true');
}

export function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_FLAG_KEY, 'true');
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_FLAG_KEY);
  }
}

export function clearTokens() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(AUTH_FLAG_KEY);
}
