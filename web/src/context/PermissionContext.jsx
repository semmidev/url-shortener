import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getPermittedNavigation } from '@/config/navigation';
import { useTenant } from '@/context/TenantContext';
import client from '@/lib/client';

const PermissionContext = createContext(null);

/**
 * PermissionProvider — wraps the app to provide:
 *  - permissions: string[]   — active permission codes for current user in active tenant
 *  - menus: []               — permitted navigation groups filtered from static config
 *  - hasPermission(code)     — boolean check
 *  - isLoaded: boolean       — true once permissions & menus load
 */
export function PermissionProvider({ children, user }) {
  const [permissions, setPermissions] = useState([]);
  const [menus, setMenus] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const tenantCtx = useTenant();
  const activeTenant = tenantCtx?.activeTenant;

  const fetchPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions([]);
      setMenus([]);
      setIsLoaded(true);
      return;
    }

    try {
      // /auth/me returns user profile with permissions evaluated for the active tenant (via X-Tenant-ID header)
      const res = await client.get('/auth/me');
      const userData = res.data?.data || res.data;
      const perms = Array.isArray(userData?.permissions) ? userData.permissions : [];
      setPermissions(perms);

      const permittedNav = getPermittedNavigation((code) => {
        if (!code) return true;
        return perms.includes(code);
      });
      setMenus(permittedNav);
    } catch {
      // Fallback: use user.permissions attached to user object
      const perms = Array.isArray(user?.permissions) ? user.permissions : [];
      setPermissions(perms);
      setMenus(getPermittedNavigation((code) => !code || perms.includes(code)));
    } finally {
      setIsLoaded(true);
    }
  }, [user?.id, activeTenant?.id]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (code) => {
      if (!code) return true; // no guard = always visible
      if (!user) return false;
      return permissions.includes(code);
    },
    [permissions, user]
  );

  return (
    <PermissionContext.Provider value={{ permissions, menus, hasPermission, refetch: fetchPermissions, isLoaded }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext() {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error('usePermissionContext must be used within <PermissionProvider>');
  }
  return ctx;
}
