import client from '@/lib/client';

export async function getTenantRoles(tenantId) {
  const res = await client.get(`/tenants/${tenantId}/roles`);
  return res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
}

export async function createTenantRole(tenantId, data) {
  const res = await client.post(`/tenants/${tenantId}/roles`, data);
  return res.data?.data || res.data;
}

export async function updateTenantRolePermissions(tenantId, roleId, permissions) {
  const res = await client.put(`/tenants/${tenantId}/roles/${roleId}/permissions`, { permissions });
  return res.data?.data || res.data;
}

export async function deleteTenantRole(tenantId, roleId) {
  const res = await client.delete(`/tenants/${tenantId}/roles/${roleId}`);
  return res.data?.data || res.data;
}

export async function getTenantMembers(tenantId) {
  const res = await client.get(`/tenants/${tenantId}/members`);
  return res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
}

export async function addTenantMember(tenantId, email, role) {
  const res = await client.post(`/tenants/${tenantId}/members`, { email, role });
  return res.data?.data || res.data;
}

export async function updateTenantMemberRole(tenantId, userId, role) {
  const res = await client.put(`/tenants/${tenantId}/members/${userId}`, { role });
  return res.data?.data || res.data;
}

export async function removeTenantMember(tenantId, userId) {
  const res = await client.delete(`/tenants/${tenantId}/members/${userId}`);
  return res.data?.data || res.data;
}

export async function updateTenant(tenantId, data) {
  const res = await client.put(`/tenants/${tenantId}`, data);
  return res.data?.data || res.data;
}

export async function regenerateJoinCode(tenantId) {
  const res = await client.post(`/tenants/${tenantId}/join-code/regenerate`);
  return res.data?.data || res.data;
}

export async function deleteTenant(tenantId) {
  const res = await client.delete(`/tenants/${tenantId}`);
  return res.data?.data || res.data;
}
