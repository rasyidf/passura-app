/**
 * KioskErrorBanner — full-width error banner for kiosk flows.
 *
 * Requirements: 9.7, 9.8
 * - role="alert" + aria-live="assertive" for immediate screen-reader announcement
 * - Uses --destructive / --destructive-foreground CSS variables (WCAG AA contrast)
 * - Spans full width of the Step_Card
 */

export interface KioskErrorBannerProps {
  message: string
}

export function KioskErrorBanner({ message }: KioskErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full rounded-md bg-destructive text-destructive-foreground px-4 py-3 text-lg font-medium"
    >
      {message}
    </div>
  )
}
