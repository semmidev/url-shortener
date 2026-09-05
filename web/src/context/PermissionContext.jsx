import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getPermittedNavigation } from '@/config/navigation';

const PermissionContext = createContext(null);

/**
 * PermissionProvider — wraps the entire app to provide:
 *  - permissions: string[]   — active permission codes for current user
 *  - menus: []               — permitted navigation groups filtered from static code config
 *  - hasPermission(code)     — boolean check
 *  - isLoaded: boolean       — true once user state evaluates
 */
export function PermissionProvider({ children, user }) {
  const [permissions, setPermissions] = useState([]);
  const [menus, setMenus] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const hasPermission = useCallback(
    (code) => {
      if (!code) return true; // no guard = always visible
      if (!user) return false;
      // superadmin and admin bypass permission checks
      if (user.role === 'superadmin' || user.role === 'admin') return true;
      return permissions.includes(code);
    },
    [permissions, user]
  );

  useEffect(() => {
    if (!user?.id) {
      setPermissions([]);
      setMenus([]);
      setIsLoaded(true);
      return;
    }

    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    setPermissions(perms);

    // Compute static permitted navigation based on current user permissions
    const permittedNav = getPermittedNavigation((code) => {
      if (!code) return true;
      if (user.role === 'superadmin' || user.role === 'admin') return true;
      return perms.includes(code);
    });

    setMenus(permittedNav);
    setIsLoaded(true);
  }, [user]);

  const refetch = useCallback(() => {
    if (user?.id) {
      const perms = Array.isArray(user.permissions) ? user.permissions : [];
      setPermissions(perms);
      setMenus(getPermittedNavigation(hasPermission));
    }
  }, [user, hasPermission]);

  return (
    <PermissionContext.Provider value={{ permissions, menus, hasPermission, refetch, isLoaded }}>
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
