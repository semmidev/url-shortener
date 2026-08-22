import client from '@/lib/client';

/**
 * Fetch short URLs list with optional search, active status filter, pagination, and sorting.
 */
export async function getShortUrls({ page = 1, limit = 50, search = '', active = 'all', sortBy = 'created_at', sortDirection = 'desc' } = {}) {
  let endpoint = `/urls?page=${page}&limit=${limit}&sort_by=${sortBy}&sort_direction=${sortDirection}`;
  if (search && search.trim()) {
    endpoint += `&search=${encodeURIComponent(search.trim())}`;
  }
  if (active === 'active') endpoint += `&active=1`;
  else if (active === 'inactive') endpoint += `&active=0`;
  else if (active === 'all') endpoint += `&active=-1`;

  const res = await client.get(endpoint);
  return res.data;
}

/**
 * Fetch details of a specific short URL by ID.
 */
export async function getShortUrlByID(id) {
  const res = await client.get(`/urls/${id}`);
  return res.data?.data || res.data;
}

/**
 * Fetch click analytics and event logs for a specific short URL by ID.
 */
export async function getShortUrlAnalytics(id) {
  const res = await client.get(`/urls/${id}/analytics`);
  return res.data?.data || res.data;
}

/**
 * Create a new short URL.
 */
export async function createShortUrl(data) {
  const res = await client.post('/urls', data);
  return res.data;
}

/**
 * Update an existing short URL (e.g. toggle active status or update fields).
 */
export async function updateShortUrl(id, data) {
  const res = await client.put(`/urls/${id}`, data);
  return res.data;
}

/**
 * Delete a short URL by ID.
 */
export async function deleteShortUrl(id) {
  const res = await client.delete(`/urls/${id}`);
  return res.data;
}

/**
 * Inspect safety and preview details of a short URL by code.
 */
export async function previewShortUrl(code) {
  const res = await fetch(`/${code}/preview`);
  if (!res.ok) throw new Error('Preview request failed');
  return res.json();
}
