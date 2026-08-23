import React, { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronRightIcon } from "lucide-react"

function NavMainItem({ item }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setOpenMobile, isMobile, state } = useSidebar()

  const hasSubItems = Boolean(item.items && item.items.length > 0)
  const isCollapsed = state === "collapsed" && !isMobile

  // Check matching active status
  const isSubActive = (sub) =>
    sub.exact
      ? pathname === sub.url
      : pathname === sub.url || (sub.url !== "#" && pathname.startsWith(sub.url + "/"))

  const isChildActive = hasSubItems && item.items.some(isSubActive)
  const isSelfActive = item.exact
    ? pathname === item.url
    : item.url && item.url !== "#" && (pathname === item.url || pathname.startsWith(item.url + "/"))

  const isActive = isSelfActive || isChildActive

  // Collapsible open state for expanded view
  const [isOpen, setIsOpen] = useState(isChildActive || isActive)

  useEffect(() => {
    if (isChildActive) {
      setIsOpen(true)
    }
  }, [isChildActive])

  // Scenario 1: Standalone Menu Item (No Sub-items)
  if (!hasSubItems) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={isActive}
          render={<Link to={item.url || "#"} />}
          className={`transition-colors duration-200 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:border-l-0! group-data-[collapsible=icon]:rounded-lg! ${
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
          {item.badge && (
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary group-data-[collapsible=icon]:hidden">
              {item.badge}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  // Scenario 2: Collapsed Sidebar (Icon-only mode with Flyout Dropdown)
  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive}
                className={`transition-colors duration-200 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:rounded-lg! ${
                  isActive
                    ? "bg-primary/15! text-primary! font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              />
            }
          >
            <span className={`transition-colors shrink-0 flex items-center justify-center ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              {item.icon}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-48 shadow-md">
            <DropdownMenuLabel className="flex items-center gap-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              {item.icon}
              <span>{item.title}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {item.items.map((subItem) => {
              const active = isSubActive(subItem)
              return (
                <DropdownMenuItem
                  key={subItem.title}
                  onClick={() => navigate(subItem.url)}
                  className={`cursor-pointer gap-2 ${active ? "bg-primary/10 text-primary font-semibold" : ""}`}
                >
                  {subItem.icon || <span className="size-1.5 rounded-full bg-current opacity-60" />}
                  <span>{subItem.title}</span>
                  {subItem.badge && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                      {subItem.badge}
                    </span>
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  // Scenario 3: Expanded Sidebar / Mobile View (Accordion Dropdown Sub-menu)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.title}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full justify-between transition-colors duration-200 cursor-pointer ${
          isActive
            ? "bg-primary/10! text-primary! font-semibold border-l-2 border-l-primary rounded-l-none pl-3!"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`transition-colors shrink-0 flex items-center justify-center ${isActive ? "text-primary" : "text-muted-foreground"}`}>
            {item.icon}
          </span>
          <span className="truncate">{item.title}</span>
        </div>
        <ChevronRightIcon
          className={`size-4 shrink-0 transition-transform duration-200 text-muted-foreground ${
            isOpen ? "rotate-90 text-foreground" : ""
          }`}
        />
      </SidebarMenuButton>

      {isOpen && (
        <SidebarMenuSub className="my-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {item.items.map((subItem) => {
            const active = isSubActive(subItem)
            return (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  isActive={active}
                  render={<Link to={subItem.url} />}
                  onClick={() => isMobile && setOpenMobile(false)}
                  className={`transition-colors duration-150 cursor-pointer rounded-md ${
                    active
                      ? "bg-primary/10! text-primary! font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span className="shrink-0 flex items-center justify-center">
                    {subItem.icon || (
                      <span
                        className={`size-1.5 rounded-full transition-colors ${
                          active ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                    )}
                  </span>
                  <span className="truncate text-xs">{subItem.title}</span>
                  {subItem.badge && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                      {subItem.badge}
                    </span>
                  )}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

export function NavMain({ items }) {
  return (
    <SidebarGroupContent className="flex flex-col gap-1.5">
      <SidebarMenu>
        {items.map((item) => (
          <NavMainItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  )
}
