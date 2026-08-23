import { useEffect, useRef } from "react"
import { toast } from "sonner"

const INTERVAL = 2 * 60 * 1000 // Check every 2 minutes
const VERSION_URL = "/api/v1/app/version"

export function useVersionCheck() {
  const versionRef = useRef(null)

  useEffect(() => {
    let isChecking = false

    async function check() {
      if (isChecking) return
      isChecking = true
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`)
        const json = await res.json()
        const newVer = json?.data?.version
        if (newVer == null) return

        if (versionRef.current == null) {
          versionRef.current = newVer
          return
        }

        if (newVer !== versionRef.current) {
          versionRef.current = newVer
          toast.success("Versi baru tersedia. Memuat ulang...")
          setTimeout(async () => {
            try {
              if ("serviceWorker" in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                for (const r of registrations) {
                  await r.unregister()
                }
              }
              if ("caches" in window) {
                const keys = await caches.keys()
                for (const key of keys) {
                  await caches.delete(key)
                }
              }
            } catch {
              // ignore
            }
            const url = new URL(window.location.href)
            url.searchParams.set("newVer", Date.now().toString())
            window.location.href = url.toString()
          }, 2000)
        }
      } catch {
        // ignore
      } finally {
        isChecking = false
      }
    }

    check()

    const id = setInterval(check, INTERVAL)

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        check()
      }
    }
    document.addEventListener("visibilitychange", handleFocus)
    window.addEventListener("focus", handleFocus)

    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", handleFocus)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])
}
