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
    id: "workspace",
    title_id: "Manajemen Workspace",
    title_en: "Workspace Management",
    is_group: true,
    children: [
      {
        id: "workspace-links",
        title_id: "Kontrol Link Workspace",
        title_en: "Workspace Links",
        path: "/dashboard/workspace/links",
        icon: "Globe",
        requiredPermission: "links.read",
      },
      {
        id: "workspace-members",
        title_id: "Anggota Workspace",
        title_en: "Workspace Members",
        path: "/dashboard/workspace/members",
        icon: "Users",
        requiredPermission: "tenants.members.manage",
      },
      {
        id: "workspace-roles",
        title_id: "Peran & Akses",
        title_en: "Roles & Access",
        path: "/dashboard/workspace/roles",
        icon: "KeyRound",
        requiredPermission: "roles.read",
      },
      {
        id: "workspace-settings",
        title_id: "Pengaturan Workspace",
        title_en: "Workspace Settings",
        path: "/dashboard/workspace/settings",
        icon: "Settings",
        requiredPermission: "tenants.update",
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
