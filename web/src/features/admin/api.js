import client from '@/lib/client';

export async function getAdminStats() {
  const res = await client.get('/admin/stats/overview');
  return res.data?.data || res.data;
}

export async function getAdminUsers(params = {}) {
  const res = await client.get('/admin/users', { params });
  const items = res.data?.items || res.data?.users || res.data?.data?.users || [];
  const meta = res.data?.meta || res.data?.data?.meta || {};
  return { users: items, meta };
}

export async function suspendUser(id, isSuspended) {
  const res = await client.patch(`/admin/users/${id}/status`, { is_suspended: isSuspended });
  return res.data?.data || res.data;
}

export async function updateUserRole(id, role) {
  const res = await client.patch(`/admin/users/${id}/role`, { role });
  return res.data?.data || res.data;
}

export async function revokeUserSessions(id) {
  const res = await client.delete(`/admin/users/${id}/sessions`);
  return res.data?.data || res.data;
}

export async function getAdminRoles() {
  const res = await client.get('/admin/roles');
  return res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
}

export async function createAdminRole(data) {
  const res = await client.post('/admin/roles', data);
  return res.data?.data || res.data;
}

export async function updateRolePermissions(roleId, permissions) {
  const res = await client.put(`/admin/roles/${roleId}/permissions`, { permissions });
  return res.data?.data || res.data;
}

export async function getAdminPermissions() {
  const res = await client.get('/admin/permissions');
  return res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
}

export async function getAdminMenus() {
  const res = await client.get('/admin/menus');
  return res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
}

export async function getMyPermittedMenus() {
  const res = await client.get('/admin/menus/my');
  return res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
}

export async function createAdminMenu(data) {
  const res = await client.post('/admin/menus', data);
  return res.data?.data || res.data;
}

export async function updateAdminMenu(id, data) {
  const res = await client.put(`/admin/menus/${id}`, data);
  return res.data?.data || res.data;
}

export async function reorderAdminMenus(items) {
  const res = await client.put('/admin/menus/reorder', { items });
  return res.data?.data || res.data;
}

export async function deleteAdminMenu(id) {
  const res = await client.delete(`/admin/menus/${id}`);
  return res.data?.data || res.data;
}

export async function getGlobalLinks(params = {}) {
  const res = await client.get('/admin/links', { params });
  const items = res.data?.items || res.data?.links || res.data?.data?.links || [];
  const meta = res.data?.meta || res.data?.data?.meta || {};
  return { links: items, meta };
}

export async function banGlobalLink(id, isActive) {
  const res = await client.patch(`/admin/links/${id}/ban`, { is_active: isActive });
  return res.data?.data || res.data;
}

export async function forceDeleteLink(id) {
  const res = await client.delete(`/admin/urls/${id}`);
  return res.data?.data || res.data;
}

export async function getAuditLogs(params = {}) {
  const res = await client.get('/admin/audit-logs', { params });
  const items = res.data?.items || res.data?.logs || res.data?.data?.logs || [];
  const meta = res.data?.meta || res.data?.data?.meta || {};
  return { logs: items, meta };
}

export async function getSystemConfigs() {
  const res = await client.get('/admin/system/config');
  return res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
}

export async function updateSystemConfig(key, value, description = '') {
  const res = await client.put(`/admin/system/config/${key}`, { value, description });
  return res.data?.data || res.data;
}
