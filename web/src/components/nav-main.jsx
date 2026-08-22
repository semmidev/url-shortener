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
    <SidebarGroupContent className="flex flex-col gap-1.5">
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
                className={`transition-all duration-200 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:border-l-0! group-data-[collapsible=icon]:rounded-lg! ${
                  isActive
                    ? "bg-primary/10! text-primary! font-semibold border-l-2 border-l-primary rounded-l-none pl-3! group-data-[collapsible=icon]:bg-primary/15! group-data-[collapsible=icon]:text-primary!"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <span className={`transition-colors shrink-0 flex items-center justify-center ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {item.icon}
                </span>
                <span className={`group-data-[collapsible=icon]:hidden ${isActive ? "text-primary" : ""}`}>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroupContent>
  )
}
