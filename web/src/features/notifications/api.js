import client from '@/lib/client';

export async function getNotifications(params = {}) {
  const res = await client.get('/notifications', { params });
  return res.data;
}

export async function getUnreadNotificationCount() {
  const res = await client.get('/notifications/unread-count');
  return res.data;
}

export async function markNotificationAsRead(id) {
  const res = await client.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await client.patch('/notifications/read-all');
  return res.data;
}

export async function deleteNotification(id) {
  const res = await client.delete(`/notifications/${id}`);
  return res.data;
}

export async function clearReadNotifications() {
  const res = await client.delete('/notifications/read');
  return res.data;
}
