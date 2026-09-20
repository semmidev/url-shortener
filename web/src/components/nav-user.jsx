import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { useAuthStore } from "@/features/auth/store"
import { useI18n } from "@/context/I18nContext"
import { useTenant } from "@/context/TenantContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  EllipsisVerticalIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  CheckIcon,
  Building2Icon,
  PlusIcon,
  KeyIcon,
  UserIcon,
  ChevronsUpDownIcon,
} from "lucide-react"
import { startTransition, addTransitionType } from "react"
import { useNavigate } from "react-router-dom"

function getInitials(name) {
  if (!name) return "??"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function NavUser({ user }) {
  const { t } = useI18n()
  const { isMobile, setOpenMobile } = useSidebar()
  const navigate = useNavigate()
  const { tenants, activeTenant, selectTenant, openJoinModal, openCreateModal } = useTenant()
  const initials = getInitials(user.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center!" />
            }>
            <Avatar className="size-8 rounded-lg shrink-0">
              <AvatarImage src={user.avatar_url || user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold font-mono text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 min-w-0 text-left text-sm leading-tight gap-0.5 group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold text-foreground">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground flex items-center gap-1">
                <Building2Icon className="size-3 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{activeTenant?.name || "Personal Workspace"}</span>
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" aria-hidden="true" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-64"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}>

            {/* User identity header */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user.avatar_url || user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold font-mono text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground flex items-center gap-1">
                      <UserIcon className="size-3" aria-hidden="true" /> {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Workspace Switcher Submenu */}
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Building2Icon className="mr-2 size-4 text-primary" aria-hidden="true" />
                  <span className="truncate font-medium">
                    {activeTenant ? activeTenant.name : "Pilih Workspace"}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-52">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1">
                    Daftar Workspace
                  </DropdownMenuLabel>
                  {tenants.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      className="cursor-pointer flex items-center justify-between py-1.5"
                      onClick={() => selectTenant(t)}
                    >
                      <span className="truncate font-medium">{t.name}</span>
                      {t.id === activeTenant?.id && (
                        <CheckIcon className="size-4 text-primary shrink-0 ml-2" aria-hidden="true" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-primary focus:text-primary"
                    onClick={() => openJoinModal()}
                  >
                    <KeyIcon className="mr-2 size-4" aria-hidden="true" />
                    Gabung Workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-primary focus:text-primary"
                    onClick={() => openCreateModal()}
                  >
                    <PlusIcon className="mr-2 size-4" aria-hidden="true" />
                    Buat Workspace Baru
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Account Profile link */}
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  if (typeof addTransitionType === "function") {
                    startTransition(() => {
                      addTransitionType("nav-forward");
                      navigate('/dashboard/account');
                    });
                  } else {
                    navigate('/dashboard/account');
                  }
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <CircleUserRoundIcon aria-hidden="true" />
                {t("nav.accountProfile")}
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem
              onClick={async () => {
                await useAuthStore.getState().logout()
                window.location.href = "/login"
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOutIcon aria-hidden="true" />
              {t("common.logout")}
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
