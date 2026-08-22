import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { useAuthStore } from "@/features/auth/store"
import { useI18n } from "@/context/I18nContext"
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
  PaletteIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"

const THEMES = [
  { id: "astro-vista", name: "Astro Vista" },
  { id: "claude",      name: "Claude"      },
  { id: "light-green", name: "Light Green" },
  { id: "mono",        name: "Mono"        },
  { id: "neobrutualism", name: "Neobrutalism" },
  { id: "notebook",   name: "Notebook"    },
  { id: "supabase",   name: "Supabase"    },
  { id: "vercel",     name: "Vercel"      },
  { id: "whatsapp",   name: "WhatsApp"    },
  { id: "zen",        name: "Zen"         },
]

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
  const { theme, setTheme } = useTheme()
  const initials = getInitials(user.name)
  const isAdmin = user?.role === "admin"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }>
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={user.avatar_url || user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold font-mono text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight gap-0.5">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-foreground/70">
                {user.email}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-60"
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
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground flex items-center gap-1">
                      {isAdmin
                        ? <><ShieldCheckIcon className="size-3" /> {t("common.administrator")}</>
                        : <><UserIcon className="size-3" /> Member</>
                      }
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Account link */}
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  if (isMobile) setOpenMobile(false)
                  navigate('/dashboard/account')
                }}
              >
                <CircleUserRoundIcon />
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
              <LogOutIcon />
              {t("common.logout")}
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
