import client from '@/lib/client';

/**
 * Fetch overall dashboard analytics metrics (total clicks, top referrers, device breakdown, clicks over time).
 */
export async function getDashboardAnalytics() {
  const res = await client.get('/analytics/dashboard');
  return res.data?.data || res.data;
}
