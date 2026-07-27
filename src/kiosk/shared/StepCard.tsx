import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface StepCardProps {
  /** 0-based step index */
  stepIndex: number
  totalSteps: number
  title: string
  children: React.ReactNode
  onNext?: () => void
  onBack?: () => void
  /** @default "Lanjut" */
  nextLabel?: string
  /** @default "Kembali" */
  backLabel?: string
  nextDisabled?: boolean
  isLoading?: boolean
}

/**
 * Base layout card for every wizard and kiosk step.
 *
 * Renders as a bounded card (max-w-2xl, max-h-[600px]) with a scrollable
 * content area. Designed to be used inside a full-screen overlay backdrop
 * provided by the parent (e.g. OnboardingGuard portal).
 *
 * Requirements: 2.3, 2.4, 9.1, 9.2, 9.3, 9.4
 */
export function StepCard({
  stepIndex,
  totalSteps,
  title,
  children,
  onNext,
  onBack,
  nextLabel = 'Lanjut',
  backLabel = 'Kembali',
  nextDisabled = false,
  isLoading = false,
}: StepCardProps) {
  const currentStep = stepIndex + 1 // 1-based for display
  const progressLabel = `Langkah ${currentStep} dari ${totalSteps}`

  // Update browser tab title to current step title (Requirement 9.4 / screen-reader support)
  useEffect(() => {
    document.title = title
  }, [title])

  return (
    /*
      Card: max width for comfortable reading, max height 600px so the card
      never takes over the full screen. Content area scrolls when it overflows.
      The parent overlay is responsible for centering this card.
    */
    <div
      role="main"
      className={cn(
        'flex flex-col w-full max-w-2xl max-h-[600px]',
        'bg-background rounded-xl shadow-lg border border-border',
        'mx-auto overflow-hidden',
      )}
    >
      {/* Header: progress + title — fixed, never scrolls away */}
      <div className="px-8 pt-8 pb-4 shrink-0">
        {/* Progress indicator — Requirement 2.3, 9.4 */}
        <p
          className="text-sm text-muted-foreground mb-3"
          aria-label={progressLabel}
        >
          {progressLabel}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-muted mb-5" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step title — Requirement 9.1: minimum 24px */}
        <h1 className={cn('kiosk-h1')}>{title}</h1>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-8 py-2 min-h-0">
        {children}
      </div>

      {/* Navigation — fixed footer, never scrolls. Requirement 9.2 (48×48px), 9.3 */}
      <div className="px-8 py-5 shrink-0 border-t border-border bg-background">
        <div className="flex items-center justify-between gap-4">
          {/* Back button — secondary action, only shown when onBack is provided */}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className={cn(
                'kiosk-btn',
                'rounded-md border border-input bg-background text-foreground',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50',
                'transition-colors'
              )}
            >
              {backLabel}
            </button>
          ) : (
            // Spacer so the forward button stays right-aligned when there's no back button
            <span aria-hidden="true" />
          )}

          {/* Forward button — sole primary action per card (Requirement 9.3) */}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled || isLoading}
              className={cn(
                'kiosk-btn',
                'rounded-md bg-primary text-primary-foreground',
                'hover:brightness-110 active:brightness-90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50',
                'transition-[filter]'
              )}
            >
              {isLoading ? 'Memuat…' : nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
