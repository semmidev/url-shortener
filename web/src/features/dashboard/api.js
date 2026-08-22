import client from '@/lib/client';

/**
 * Fetch overview dashboard metrics (recent links, total links count, etc.).
 */
export async function getOverviewMetrics() {
  const res = await client.get('/urls?page=1&limit=5&sort_by=created_at&sort_direction=desc');
  return res.data;
}

/**
 * Quick create short URL from Overview widget.
 */
export async function quickCreateShortUrl({ originalUrl, customCode }) {
  const body = { original_url: originalUrl };
  if (customCode && customCode.trim()) {
    body.custom_code = customCode.trim();
  }
  const res = await client.post('/urls', body);
  return res.data;
}
