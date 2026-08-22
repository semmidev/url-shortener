import client from '@/lib/client';

/**
 * Update current user's profile information (full_name).
 */
export async function updateProfile(fullName) {
  const res = await client.patch('/users/me', { full_name: fullName });
  return res.data;
}

/**
 * Change current user's password.
 */
export async function changePassword(newPassword) {
  const res = await client.patch('/users/me', { password: newPassword });
  return res.data;
}

/**
 * Get Google OAuth link URL for connecting Google account to profile.
 */
export async function getGoogleLinkURL() {
  const res = await client.get('/auth/google/link');
  return res.data;
}

/**
 * Unlink Google account connection.
 */
export async function unlinkGoogleAccount() {
  const res = await client.post('/auth/google/unlink');
  return res.data;
}
