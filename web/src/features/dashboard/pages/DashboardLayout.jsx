import { useState, useRef, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useTheme } from "next-themes"
import { Moon, Sun, Palette, CheckIcon } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { LanguageToggle } from "@/components/LanguageToggle"
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

const THEMES = [
  { id: "astro-vista",    name: "Astro Vista",   color: "#0b0f1c" },
  { id: "claude",         name: "Claude",        color: "#f5f0eb" },
  { id: "light-green",    name: "Light Green",   color: "#f0faf0" },
  { id: "mono",           name: "Mono",          color: "#e8e8e8" },
  { id: "neobrutualism",  name: "Neobrutalism",  color: "#fff"    },
  { id: "notebook",       name: "Notebook",      color: "#faf6f0" },
  { id: "supabase",       name: "Supabase",      color: "#1c1c1c" },
  { id: "vercel",         name: "Vercel",        color: "#000"    },
  { id: "whatsapp",       name: "WhatsApp",      color: "#e5ddd8" },
  { id: "zen",            name: "Zen",           color: "#f8f4f0" },
]

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const [activePreset, setActivePreset] = useState("vercel")
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const themeMenuRef = useRef(null)

  // Restore preset theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme-preset") || "vercel"
    document.documentElement.dataset.theme = saved
    setActivePreset(saved)
  }, [])

  // Close theme menu on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setShowThemeMenu(false)
      }
    }
    if (showThemeMenu) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [showThemeMenu])

  // Preset palette switch helper
  function switchThemePreset(themeId) {
    document.documentElement.setAttribute('data-theme', themeId)
    localStorage.setItem("theme-preset", themeId)
    setActivePreset(themeId)
    setShowThemeMenu(false)
  }

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
        <header className="flex h-14 items-center justify-between border-b border-border/60 px-4 lg:px-6 shrink-0 bg-card sticky top-0 z-40">

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
            <div className="relative" ref={themeMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("common.colorPreset")}
                onClick={() => setShowThemeMenu((v) => !v)}
                className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Palette className="h-4 w-4" />
              </Button>

              {showThemeMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-card border border-border rounded-xl shadow-xl py-1 max-h-72 overflow-y-auto animate-in fade-in-20">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("common.colorPreset")}</p>
                  {THEMES.map((tItem) => (
                    <button
                      key={tItem.id}
                      onClick={() => switchThemePreset(tItem.id)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 hover:bg-muted transition-colors cursor-pointer ${activePreset === tItem.id ? "text-primary font-semibold" : "text-foreground"}`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-border/60 shrink-0"
                        style={{ backgroundColor: tItem.color }}
                      />
                      {tItem.name}
                      {activePreset === tItem.id && <CheckIcon className="ml-auto h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
