import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/features/auth/store"
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
      <SidebarHeader className="h-(--header-height) justify-center border-b border-border/40 px-2 shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<button onClick={() => navigate("/dashboard")} />}
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold transition-all duration-200">
                <ZapIcon className="size-5" />
              </div>
              <span className="text-base font-semibold">URL Shortener</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Home</SidebarGroupLabel>
          <NavMain items={[
            { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon className="size-4" />, exact: true },
          ]} />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Links</SidebarGroupLabel>
          <NavMain items={[
            { title: "Short URLs", url: "/dashboard/urls", icon: <Link2Icon className="size-4" /> },
            { title: "Analytics", url: "/dashboard/analytics", icon: <BarChart3Icon className="size-4" /> },
          ]} />
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <NavMain items={[
              { title: "User Management", url: "/dashboard/admin", icon: <ShieldCheckIcon className="size-4" /> },
            ]} />
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <NavMain items={[
            { title: "Account Profile", url: "/dashboard/account", icon: <UserIcon className="size-4" /> },
          ]} />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
