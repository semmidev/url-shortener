/**
 * Static Predefined Application Navigation Configuration (Source of Truth for Frontend Menu Derivative)
 * Each item specifies title, path, icon, and optional requiredPermission.
 */
export const NAVIGATION_GROUPS = [
  {
    id: "home",
    title_id: "Beranda",
    title_en: "Home",
    is_group: true,
    children: [
      {
        id: "overview",
        title_id: "Ringkasan",
        title_en: "Overview",
        path: "/dashboard",
        icon: "LayoutDashboard",
        requiredPermission: null, // Visible to all authenticated users
      },
    ],
  },
  {
    id: "links",
    title_id: "Tautan",
    title_en: "Links",
    is_group: true,
    children: [
      {
        id: "my-links",
        title_id: "URL Singkat",
        title_en: "My Links",
        path: "/dashboard/urls",
        icon: "Link",
        requiredPermission: "urls.read",
      },
      {
        id: "analytics",
        title_id: "Analitik",
        title_en: "Analytics",
        path: "/dashboard/analytics",
        icon: "BarChart3",
        requiredPermission: "analytics.read",
      },
    ],
  },
  {
    id: "administration",
    title_id: "Administrasi",
    title_en: "Administration",
    is_group: true,
    requiredPermission: "admin.dashboard.read",
    children: [
      {
        id: "admin-overview",
        title_id: "Ringkasan Admin",
        title_en: "Overview",
        path: "/dashboard/admin",
        icon: "LayoutDashboard",
        requiredPermission: "admin.dashboard.read",
      },
      {
        id: "admin-users",
        title_id: "Siklus Pengguna",
        title_en: "Users Lifecycle",
        path: "/dashboard/admin/users",
        icon: "UserCog",
        requiredPermission: "users.read",
      },
      {
        id: "admin-roles",
        title_id: "Peran & RBAC",
        title_en: "Roles & RBAC",
        path: "/dashboard/admin/roles",
        icon: "KeyRound",
        requiredPermission: "roles.read",
      },
      {
        id: "admin-links",
        title_id: "Kontrol Link Global",
        title_en: "Global Link Control",
        path: "/dashboard/admin/links",
        icon: "Globe",
        requiredPermission: "links.read",
      },
      {
        id: "admin-audit",
        title_id: "Audit Trail Logs",
        title_en: "Audit Trail Logs",
        path: "/dashboard/admin/audit-logs",
        icon: "FileText",
        requiredPermission: "audit.read",
      },
      {
        id: "admin-system",
        title_id: "Konfigurasi Sistem",
        title_en: "System Config",
        path: "/dashboard/admin/system",
        icon: "Sliders",
        requiredPermission: "system.config.read",
      },
    ],
  },
  {
    id: "settings",
    title_id: "Pengaturan",
    title_en: "Settings",
    is_group: true,
    children: [
      {
        id: "account",
        title_id: "Profil Akun",
        title_en: "Account Profile",
        path: "/dashboard/account",
        icon: "User",
        requiredPermission: null,
      },
    ],
  },
];

/**
 * Filter the static navigation groups according to current user's permissions.
 */
export function getPermittedNavigation(hasPermission) {
  const result = [];

  for (const group of NAVIGATION_GROUPS) {
    // If group itself requires permission check and user fails, skip entire group
    if (group.requiredPermission && !hasPermission(group.requiredPermission)) {
      continue;
    }

    // Filter children based on requiredPermission
    const permittedChildren = (group.children || []).filter(
      (child) => !child.requiredPermission || hasPermission(child.requiredPermission)
    );

    if (permittedChildren.length > 0) {
      result.push({
        ...group,
        children: permittedChildren,
      });
    }
  }

  return result;
}

/**
 * Helper to find navigation item by route path.
 */
export function findNavigationItemByPath(targetPath) {
  for (const group of NAVIGATION_GROUPS) {
    if (group.path === targetPath) return group;
    for (const child of group.children || []) {
      if (child.path === targetPath) return child;
    }
  }
  return null;
}
