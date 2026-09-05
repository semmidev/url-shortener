import { useState, useRef, useEffect } from "react"
import { Palette, CheckIcon } from "lucide-react"
import { useI18n } from "@/context/I18nContext"
import { Button } from "@/components/ui/button"

export const THEMES = [
  { id: "claude",   name: "Claude",   color: "#f5f0eb" },
  { id: "whatsapp", name: "WhatsApp", color: "#e5ddd8" },
]

export function useThemePreset() {
  const [activePreset, setActivePreset] = useState(() => {
    const saved = localStorage.getItem("theme-preset")
    if (saved === "whatsapp" || saved === "claude") return saved
    return "claude"
  })

  useEffect(() => {
    let saved = localStorage.getItem("theme-preset")
    if (saved !== "whatsapp" && saved !== "claude") {
      saved = "claude"
      localStorage.setItem("theme-preset", "claude")
    }
    document.documentElement.setAttribute("data-theme", saved)
    setActivePreset(saved)

    function handleStorage(e) {
      if (e.key === "theme-preset" && e.newValue) {
        const val = (e.newValue === "whatsapp" || e.newValue === "claude") ? e.newValue : "claude"
        document.documentElement.setAttribute("data-theme", val)
        setActivePreset(val)
      }
    }

    function handleCustom(e) {
      if (e.detail) {
        const val = (e.detail === "whatsapp" || e.detail === "claude") ? e.detail : "claude"
        document.documentElement.setAttribute("data-theme", val)
        setActivePreset(val)
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("theme-preset-changed", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("theme-preset-changed", handleCustom)
    }
  }, [])

  const setPreset = (themeId) => {
    const valid = (themeId === "whatsapp" || themeId === "claude") ? themeId : "claude"
    document.documentElement.setAttribute("data-theme", valid)
    localStorage.setItem("theme-preset", valid)
    setActivePreset(valid)
    window.dispatchEvent(new CustomEvent("theme-preset-changed", { detail: valid }))
  }

  return { activePreset, setPreset, THEMES }
}

export function ThemePresetPicker({ className = "" }) {
  const { t } = useI18n()
  const { activePreset, setPreset } = useThemePreset()
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const themeMenuRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setShowThemeMenu(false)
      }
    }
    if (showThemeMenu) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [showThemeMenu])

  return (
    <div className={`relative ${className}`} ref={themeMenuRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("common.colorPreset")}
        aria-expanded={showThemeMenu}
        aria-haspopup="menu"
        onClick={() => setShowThemeMenu((v) => !v)}
        className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <Palette className="h-4 w-4" aria-hidden="true" />
      </Button>

      {showThemeMenu && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-1 z-50 w-44 bg-card border border-border rounded-xl shadow-xl py-1 max-h-72 overflow-y-auto animate-in fade-in-20"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("common.colorPreset")}
          </p>
          {THEMES.map((tItem) => (
            <button
              key={tItem.id}
              role="menuitem"
              onClick={() => {
                setPreset(tItem.id)
                setShowThemeMenu(false)
              }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 hover:bg-muted transition-colors cursor-pointer ${
                activePreset === tItem.id ? "text-primary font-semibold" : "text-foreground"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-border/60 shrink-0"
                style={{ backgroundColor: tItem.color }}
                aria-hidden="true"
              />
              {tItem.name}
              {activePreset === tItem.id && <CheckIcon className="ml-auto h-3 w-3 text-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
