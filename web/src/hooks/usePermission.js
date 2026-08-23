import { usePermissionContext } from '@/context/PermissionContext';

/**
 * usePermission — consume the global permission context.
 *
 * @returns {{
 *   permissions: string[],
 *   menus: object[],
 *   hasPermission: (code: string) => boolean,
 *   refetch: () => void,
 *   isLoaded: boolean
 * }}
 *
 * Usage:
 *   const { hasPermission, refetch } = usePermission();
 *   if (hasPermission('users.suspend')) { ... }
 */
export function usePermission() {
  return usePermissionContext();
}
