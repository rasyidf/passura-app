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
    /* Outer shell: full-screen background with dimmed surround on large displays */
    <div role="main" className="flex flex-col min-h-screen bg-muted/30">
      {/*
        Inner panel: centered card, capped at a comfortable reading width.
        max-w-3xl (48rem / ~768px) feels like an app panel rather than a phone
        column, while still leaving visible background on 2K/4K.
        min-h-screen ensures it fills vertical space on small screens.
      */}
      <div className="flex flex-col flex-1 w-full max-w-3xl mx-auto bg-background shadow-sm min-h-screen px-8 py-10 md:px-12 md:py-14">
        {/* Progress indicator — Requirement 2.3, 9.4 */}
        <p
          className="text-lg text-muted-foreground mb-6"
          aria-label={progressLabel}
        >
          {progressLabel}
        </p>

        {/* Step title — Requirement 9.1: minimum 24px */}
        <h1 className={cn('kiosk-h1', 'mb-6')}>{title}</h1>

        {/* Step content */}
        <div className="flex-1">{children}</div>

        {/* Navigation — Requirement 9.2 (48×48px), 9.3 (max one primary action) */}
        <div className="flex items-center justify-between gap-4 mt-8">
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
