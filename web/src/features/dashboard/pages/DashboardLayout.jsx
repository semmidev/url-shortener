import { Outlet, useLocation } from "react-router-dom"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { LanguageToggle } from "@/components/LanguageToggle"
import { ThemePresetPicker } from "@/components/ThemePresetPicker"
import { useI18n } from "@/context/I18nContext"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const PAGE_TITLE_KEYS = {
  "/dashboard":            "nav.dashboard",
  "/dashboard/urls":       "nav.shortUrls",
  "/dashboard/analytics":  "nav.analytics",
  "/dashboard/admin":      "nav.userManagement",
  "/dashboard/account":    "nav.accountProfile",
}

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()

  // Resolve page title
  let pageTitle = PAGE_TITLE_KEYS[pathname] ? t(PAGE_TITLE_KEYS[pathname]) : null
  if (!pageTitle) {
    if (pathname.startsWith("/dashboard/urls/")) pageTitle = t("nav.urlDetails")
    else if (pathname.startsWith("/dashboard/admin/")) pageTitle = t("nav.admin")
    else pageTitle = t("nav.dashboard")
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="bg-background text-foreground flex flex-col min-h-screen">

        {/* Top Header Bar */}
        <header style={{ viewTransitionName: 'site-header' }} className="flex h-14 items-center justify-between border-b border-border/60 px-4 lg:px-6 shrink-0 bg-card sticky top-0 z-40">

          {/* Left: sidebar trigger + breadcrumb */}
          <div className="flex items-center gap-3">
            <SidebarTrigger className="cursor-pointer" />
            <div className="hidden sm:block h-4 w-px bg-border/60" />
            <nav className="hidden sm:flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">{t("nav.urlShortener")}</span>
              <span className="text-muted-foreground/40 select-none">/</span>
              <span className="font-medium text-foreground">{pageTitle}</span>
            </nav>
          </div>

          {/* Right: i18n language toggle + theme palette + dark mode toggle */}
          <div className="flex items-center gap-1.5">

            {/* i18n Language Toggle (top left of color presets) */}
            <LanguageToggle />

            {/* Theme palette picker */}
            <ThemePresetPicker />

            {/* Dark / light mode toggle */}
            <Button
              id="dark-mode-toggle"
              variant="ghost"
              size="icon"
              aria-label={t("common.toggleDarkMode")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
