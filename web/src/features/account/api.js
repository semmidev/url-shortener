import client from '@/lib/client';

/**
 * Update current user's profile information (full_name, avatar_url).
 */
export async function updateProfile(fullName, avatarUrl) {
  const payload = {};
  if (typeof fullName === 'object' && fullName !== null) {
    if (fullName.fullName !== undefined) payload.full_name = fullName.fullName;
    if (fullName.avatarUrl !== undefined) payload.avatar_url = fullName.avatarUrl;
  } else {
    if (fullName !== undefined) payload.full_name = fullName;
    if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;
  }

  const res = await client.put('/auth/profile', payload);
  return res.data;
}

/**
 * Request S3 Presigned URL for browser-to-S3 direct file upload.
 */
export async function requestPresignedURL({ fileName, contentType, fileSize, category = 'avatars' }) {
  const res = await client.post('/storage/presigned-url', {
    file_name: fileName,
    content_type: contentType,
    file_size: fileSize,
    category,
  });
  return res.data?.data || res.data;
}

/**
 * Change current user's password.
 */
export async function changePassword(newPassword) {
  const res = await client.put('/auth/password', { new_password: newPassword });
  return res.data;
}

/**
 * Get Google OAuth link URL for connecting Google account to profile.
 */
export async function getGoogleLinkURL() {
  const res = await client.get('/auth/google/url');
  return res.data;
}

/**
 * Unlink Google account connection.
 */
export async function unlinkGoogleAccount() {
  const res = await client.delete('/auth/google');
  return res.data;
}
