import client from '@/lib/client';

export async function loginRequest(data) {
  return client.post('/auth/login', data);
}

export async function registerRequest(data) {
  return client.post('/auth/register', data);
}

export async function logoutRequest(sessionId) {
  return client.post('/auth/logout', { session_id: sessionId });
}

export async function getCurrentUser() {
  return client.get('/auth/me');
}

export async function googleTokenExchange(code) {
  return client.post('/auth/google/token', { code });
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

export async function updateProfileRequest(data) {
  return client.patch('/users/me', data);
}
