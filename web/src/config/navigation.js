/**
 * Static Predefined Application Navigation Configuration (Source of Truth for Frontend Menu Derivative)
 * Supports 3-Level Navigation Hierarchy: Group -> Menu -> Submenu
 * Each item specifies title, path (if leaf item), icon, optional requiredPermission, and optional children.
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
    title_id: "Tautan & Analitik",
    title_en: "Links & Analytics",
    is_group: true,
    children: [
      {
        id: "link-management",
        title_id: "Kelola Tautan",
        title_en: "Link Management",
        icon: "Link2",
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
            title_id: "Analitik Traffic",
            title_en: "Traffic Analytics",
            path: "/dashboard/analytics",
            icon: "BarChart3",
            requiredPermission: "analytics.read",
          },
        ],
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
        id: "workspace-content",
        title_id: "Kontrol Link Workspace",
        title_en: "Workspace Links Control",
        icon: "Globe",
        children: [
          {
            id: "workspace-links",
            title_id: "Tautan Tim",
            title_en: "Team Links",
            path: "/dashboard/workspace/links",
            icon: "Globe",
            requiredPermission: "links.read",
          },
        ],
      },
      {
        id: "workspace-team",
        title_id: "Tim & Hak Akses",
        title_en: "Team & Permissions",
        icon: "Users",
        children: [
          {
            id: "workspace-members",
            title_id: "Anggota Workspace",
            title_en: "Workspace Members",
            path: "/dashboard/workspace/members",
            icon: "UserCheck",
            requiredPermission: "tenants.members.manage",
          },
          {
            id: "workspace-roles",
            title_id: "Peran & Akses (RBAC)",
            title_en: "Roles & Access (RBAC)",
            path: "/dashboard/workspace/roles",
            icon: "KeyRound",
            requiredPermission: "roles.read",
          },
        ],
      },
      {
        id: "workspace-config",
        title_id: "Pengaturan Workspace",
        title_en: "Workspace Settings",
        icon: "Settings",
        children: [
          {
            id: "workspace-settings",
            title_id: "Konfigurasi Umum",
            title_en: "General Settings",
            path: "/dashboard/workspace/settings",
            icon: "Sliders",
            requiredPermission: "tenants.update",
          },
        ],
      },
    ],
  },
  {
    id: "settings",
    title_id: "Pengaturan Akun dan Workspace",
    title_en: "Account Settings",
    is_group: true,
    children: [
      {
        id: "account-management",
        title_id: "Akun Saya",
        title_en: "My Account",
        icon: "User",
        children: [
          {
            id: "account",
            title_id: "Profil Akun",
            title_en: "Account Profile",
            path: "/dashboard/account",
            icon: "UserCog",
            requiredPermission: null,
          },
          {
            id: "my-workspaces",
            title_id: "Workspace Saya",
            title_en: "My Workspaces",
            path: "/dashboard/account/workspaces",
            icon: "Building2",
            requiredPermission: null,
          },
        ],
      },
    ],
  },
];

/**
 * Filter the static navigation groups according to current user's permissions.
 * Recursively checks permissions across Groups, Menus, and Submenus.
 */
export function getPermittedNavigation(hasPermission) {
  const result = [];

  for (const group of NAVIGATION_GROUPS) {
    // If group itself requires permission check and user fails, skip entire group
    if (group.requiredPermission && !hasPermission(group.requiredPermission)) {
      continue;
    }

    const permittedChildren = [];

    for (const child of group.children || []) {
      if (child.requiredPermission && !hasPermission(child.requiredPermission)) {
        continue;
      }

      // If child menu item has submenu children, filter submenus recursively
      if (child.children && child.children.length > 0) {
        const permittedSubChildren = child.children.filter(
          (sub) => !sub.requiredPermission || hasPermission(sub.requiredPermission)
        );

        if (permittedSubChildren.length > 0) {
          permittedChildren.push({
            ...child,
            children: permittedSubChildren,
          });
        }
      } else {
        permittedChildren.push(child);
      }
    }

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
 * Helper to find navigation item by route path (searches Groups, Menus, and Submenus).
 */
export function findNavigationItemByPath(targetPath) {
  for (const group of NAVIGATION_GROUPS) {
    if (group.path === targetPath) return group;
    for (const child of group.children || []) {
      if (child.path === targetPath) return child;
      for (const sub of child.children || []) {
        if (sub.path === targetPath) return sub;
      }
    }
  }
  return null;
}
