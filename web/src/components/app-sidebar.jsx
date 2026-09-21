import * as React from "react"
import { useAuthStore } from "@/features/auth/store"
import { usePermission } from "@/hooks/usePermission"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { useI18n } from "@/context/I18nContext"
import { resolveIcon } from "@/lib/iconResolver"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Loader2Icon } from "lucide-react"

/**
 * Build a NavMain item from a DB navigation menu item.
 * Recursively maps children to sub-items and selects title by language.
 */
function menuToNavItem(menu, language) {
  const icon = resolveIcon(menu.icon, { className: "size-4" })
  const subIcon = resolveIcon(menu.icon, { className: "size-3.5" })

  const isExactRoute = menu.path === "/dashboard"
  const title = language === 'id'
    ? (menu.title_id || menu.title)
    : (menu.title_en || menu.title)

  const base = {
    title,
    url: menu.path,
    icon,
    badge: menu.badge_text || undefined,
    exact: isExactRoute,
  }

  if (menu.children && menu.children.length > 0) {
    return {
      ...base,
      url: undefined, // parent items with children don't navigate themselves
      items: menu.children.map((child) => {
        const childTitle = language === 'id'
          ? (child.title_id || child.title)
          : (child.title_en || child.title)
        return {
          title: childTitle,
          url: child.path,
          icon: resolveIcon(child.icon, { className: "size-3.5" }) || subIcon,
          badge: child.badge_text || undefined,
          exact: child.path === "/dashboard",
        }
      }),
    }
  }

  return base
}

export function AppSidebar({ ...props }) {
  const user = useAuthStore((s) => s.user)
  const { menus, isLoaded } = usePermission()
  const { language, t } = useI18n()

  const sidebarUser = {
    name: user?.full_name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar_url || "",
    avatar_url: user?.avatar_url || "",
  }

  // Organize menus into Group Sections (is_group = true) and standalone items
  const { groups, standalone } = React.useMemo(() => {
    const groupList = []
    const standaloneList = []

    menus.forEach((item) => {
      if (item.is_group) {
        groupList.push(item)
      } else {
        standaloneList.push(item)
      }
    })

    return { groups: groupList, standalone: standaloneList }
  }, [menus])

  return (
    <Sidebar style={{ viewTransitionName: 'app-sidebar' }} collapsible="icon" {...props}>
      <SidebarHeader className="flex h-14 items-center border-b border-border/60 px-2 shrink-0">
        <NavUser user={sidebarUser} />
      </SidebarHeader>

      <SidebarContent>
        {!isLoaded ? (
          /* Loading skeleton while menus fetch */
          <SidebarGroup>
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin mr-2" />
              <span className="text-xs">{t('common.loading')}</span>
            </div>
          </SidebarGroup>
        ) : groups.length > 0 || standalone.length > 0 ? (
          <>
            {/* Standalone Top-Level Items (if any) */}
            {standalone.length > 0 && (
              <SidebarGroup>
                <NavMain items={standalone.map((m) => menuToNavItem(m, language))} />
              </SidebarGroup>
            )}

            {/* Group Sections with Labels */}
            {groups.map((group) => {
              const groupTitle = language === 'id'
                ? (group.title_id || group.title)
                : (group.title_en || group.title)
              return (
                <SidebarGroup key={group.id}>
                  {groupTitle && (
                    <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                      {groupTitle}
                    </SidebarGroupLabel>
                  )}
                  <NavMain items={(group.children || []).map((m) => menuToNavItem(m, language))} />
                </SidebarGroup>
              )
            })}
          </>
        ) : (
          /* Fallback if no menus returned */
          <SidebarGroup>
            <div className="px-3 py-2 text-xs text-muted-foreground">No menu items available.</div>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
