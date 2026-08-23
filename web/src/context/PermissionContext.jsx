import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getMyPermittedMenus } from '@/features/admin/api';

const PermissionContext = createContext(null);

/**
 * PermissionProvider — wraps the entire app to provide:
 *  - permissions: string[]  — active permission codes for current user
 *  - menus: []              — permitted navigation menu tree from DB
 *  - hasPermission(code)    — boolean check
 *  - refetch()              — force re-fetch (call after role/permission changes)
 *  - isLoaded: boolean      — true once first fetch completes
 */
export function PermissionProvider({ children, user }) {
  const [permissions, setPermissions] = useState([]);
  const [menus, setMenus] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastUserIdRef = useRef(null);

  const fetchPermissions = useCallback(async (currentUser) => {
    if (!currentUser?.id) {
      setPermissions([]);
      setMenus([]);
      setIsLoaded(true);
      return;
    }

    // Permissions come directly from /auth/me response (already in user object)
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    setPermissions(perms);

    // Menus are fetched from /admin/menus/my (permission-filtered tree from DB)
    try {
      const menuData = await getMyPermittedMenus();
      setMenus(Array.isArray(menuData) ? menuData : []);
    } catch {
      // If user doesn't have admin access, menus endpoint returns empty or 403
      setMenus([]);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const userId = user?.id ?? null;

    // Only re-fetch when user identity changes (login/logout/role change)
    if (userId === lastUserIdRef.current && isLoaded) return;

    lastUserIdRef.current = userId;
    fetchPermissions(user);
  }, [user, fetchPermissions, isLoaded]);

  const refetch = useCallback(() => {
    // Force re-fetch even if userId hasn't changed (e.g. after permission update)
    fetchPermissions(user);
  }, [user, fetchPermissions]);

  const hasPermission = useCallback(
    (code) => {
      if (!code) return true; // no guard = always visible
      if (!user) return false;
      // superadmin and admin bypass all checks
      if (user.role === 'superadmin' || user.role === 'admin') return true;
      return permissions.includes(code);
    },
    [permissions, user]
  );

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
