import { Link, useLocation } from "react-router-dom"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({ items }) {
  const { pathname } = useLocation()
  const { setOpenMobile, isMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = item.exact
              ? pathname === item.url
              : pathname === item.url || pathname.startsWith(item.url + "/")
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  render={<Link to={item.url} />}
                  className={`transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10! text-primary! font-semibold border-l-2 border-l-primary rounded-l-none pl-3!"
                      : "hover:bg-muted/40"
                  }`}
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <span className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {item.icon}
                  </span>
                  <span className={isActive ? "text-primary" : ""}>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
