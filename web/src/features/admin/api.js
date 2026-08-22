import client from '@/lib/client';

/**
 * Fetch system users list for administrative backoffice.
 */
export async function getAdminUsers() {
  const res = await client.get('/admin/users');
  return res.data?.items || res.data || [];
}
