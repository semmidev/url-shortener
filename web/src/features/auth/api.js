import client from '../../lib/client';

export async function loginRequest(data) {
  return client.post('/auth/login', data);
}

export async function registerRequest(data) {
  return client.post('/auth/register', data);
}

export async function logoutRequest(sessionId) {
  return client.post('/auth/logout', { session_id: sessionId });
}

export async function updateProfileRequest(data) {
  return client.patch('/users/me', data);
}

export async function getMyMembershipsRequest() {
  return client.get('/users/me/memberships');
}

export async function refreshRequest(refreshToken) {
  // This mirrors what client.js does internally in its interceptor.
  // Callers outside the interceptor may use this, but the interceptor
  // always calls the raw axios endpoint directly to avoid loops.
  return client.post('/auth/refresh', { refresh_token: refreshToken });
}

export async function impersonateRequest(userId) {
  return client.post(`/admin/users/${userId}/impersonate`);
}

export async function getGoogleAuthURL() {
  return client.get('/auth/google/url');
}

export async function getGoogleLinkURL() {
  return client.get('/auth/google/link');
}

export async function unlinkGoogleRequest() {
  return client.post('/auth/google/unlink');
}
