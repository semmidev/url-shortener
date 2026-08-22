import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/store"
import { useI18n } from "@/context/I18nContext"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  Link2Icon,
  BarChart3Icon,
  ShieldCheckIcon,
  UserIcon,
  ZapIcon,
} from "lucide-react"

export function AppSidebar({ ...props }) {
  const user = useAuthStore((s) => s.user)
  const { t } = useI18n()
  const navigate = useNavigate()

  const isAdmin = user?.role === "admin"

  const sidebarUser = {
    name: user?.full_name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar_url || "",
    avatar_url: user?.avatar_url || "",
    role: user?.role,
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-(--header-height) justify-center border-b border-border/40 px-2 shrink-0 group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:justify-center!">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center! hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
              render={<button onClick={() => navigate("/dashboard")} />}
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold transition-transform duration-200 group-hover/menu-button:scale-105 shadow-xs">
                <ZapIcon className="size-4 shrink-0" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold text-foreground tracking-tight">{t("nav.urlShortener")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.home")}</SidebarGroupLabel>
          <NavMain items={[
            { title: t("nav.dashboard"), url: "/dashboard", icon: <LayoutDashboardIcon className="size-4" />, exact: true },
          ]} />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.links")}</SidebarGroupLabel>
          <NavMain items={[
            { title: t("nav.shortUrls"), url: "/dashboard/urls", icon: <Link2Icon className="size-4" /> },
            { title: t("nav.analytics"), url: "/dashboard/analytics", icon: <BarChart3Icon className="size-4" /> },
          ]} />
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.administration")}</SidebarGroupLabel>
            <NavMain items={[
              { title: t("nav.userManagement"), url: "/dashboard/admin", icon: <ShieldCheckIcon className="size-4" /> },
            ]} />
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.settings")}</SidebarGroupLabel>
          <NavMain items={[
            { title: t("nav.accountProfile"), url: "/dashboard/account", icon: <UserIcon className="size-4" /> },
          ]} />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
