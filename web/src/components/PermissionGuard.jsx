import React from 'react';
import { usePermission } from '@/hooks/usePermission';

/**
 * PermissionGuard — renders children only if the current user has the specified permission.
 *
 * @param {string}    permission  - Permission code to check (e.g. "users.suspend")
 * @param {ReactNode} children    - Content to show if permitted
 * @param {ReactNode} fallback    - Optional fallback to render when NOT permitted (default: null)
 *
 * Usage:
 *   <PermissionGuard permission="users.suspend">
 *     <button>Suspend</button>
 *   </PermissionGuard>
 *
 *   // With disabled fallback:
 *   <PermissionGuard permission="roles.create" fallback={<button disabled>Create Role</button>}>
 *     <button>Create Role</button>
 *   </PermissionGuard>
 */
export default function PermissionGuard({ permission, children, fallback = null }) {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return children;
}
