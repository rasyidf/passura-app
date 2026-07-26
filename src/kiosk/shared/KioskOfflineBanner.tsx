import { useEffect, useState } from 'react'

/**
 * KioskOfflineBanner — sticky top banner shown when the device is offline.
 *
 * Requirements: 10.4
 * - Subscribes to window "online"/"offline" events via useEffect
 * - Renders a sticky banner with role="status" and Bahasa Indonesia text when offline
 * - Returns null when online (no DOM node at all)
 */
export function KioskOfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-10 w-full bg-muted text-muted-foreground px-4 py-2 text-center text-lg font-medium"
    >
      Offline — data disimpan lokal
    </div>
  )
}
