import { useState, useCallback } from 'react'
import { useAuth } from '@/auth/session'
import { useOnboardingState } from '@/onboarding/useOnboardingState'
import { ELDER_STEPS, getResumeStep } from '@/onboarding/onboarding-state'
import type { OnboardingState } from '@/onboarding/onboarding-state'
import { ElderStep1Welcome } from '@/onboarding/steps/elder/ElderStep1Welcome'
import { ElderStep2Clans } from '@/onboarding/steps/elder/ElderStep2Clans'
import { ElderStep3Transactions } from '@/onboarding/steps/elder/ElderStep3Transactions'
import { ElderStep4KioskIntro } from '@/onboarding/steps/elder/ElderStep4KioskIntro'
import { ElderStep5Complete } from '@/onboarding/steps/elder/ElderStep5Complete'
import { Button } from '@/components/ui/button'

interface ElderOnboardingWizardProps {
  state: OnboardingState | null
  onComplete: () => void
}

/**
 * Elder Onboarding Wizard — 5-step guided walkthrough for users with
 * role === "validator".
 *
 * - Resumes from the first incomplete step on mount.
 * - Each "Lanjut" awaits `completeStep(stepId)` BEFORE advancing the local
 *   step index (Property 2 / Requirement 2.5).
 * - Back navigation does not touch `completedSteps` (Requirement 2.6).
 * - Step 5's "Mulai Pakai" calls `completeAll()` then `onComplete()`.
 * - If any write to IndexedDB rejects, an error state is shown inside the
 *   current StepCard with "Coba Lagi" and "Tutup" buttons (Requirement 1.8).
 *
 * Validates: Requirements 1.8, 2.4, 2.5, 2.6, 2.8, 2.9
 */
export function ElderOnboardingWizard({
  state,
  onComplete,
}: ElderOnboardingWizardProps) {
  const { elder } = useAuth()
  const { completeStep, completeAll } = useOnboardingState(elder?.id ?? '')

  // Compute the initial step from the provided state prop (Requirement 2.9)
  const [currentStep, setCurrentStep] = useState<number>(() =>
    getResumeStep(ELDER_STEPS, state?.completedSteps ?? []),
  )

  // Async operation state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The last failed action — kept so "Coba Lagi" can re-invoke it
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Wraps an async write action with loading / error handling.
   * Stores the action in `pendingAction` so the "Coba Lagi" button can retry.
   */
  const runWithErrorHandling = useCallback(
    async (action: () => Promise<void>) => {
      setIsLoading(true)
      setError(null)
      setPendingAction(() => action)
      try {
        await action()
        // Clear pending action on success
        setPendingAction(null)
      } catch {
        setError('Gagal menyimpan progres. Coba lagi?')
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // ── Step navigation handlers ──────────────────────────────────────────────

  /**
   * Steps 1–4: persist the completed step, then advance.
   */
  const handleNext = useCallback(
    async (stepId: (typeof ELDER_STEPS)[number]) => {
      await runWithErrorHandling(async () => {
        await completeStep(stepId)
        // Only advance AFTER the write succeeds (Property 2 / Req 2.5)
        setCurrentStep((s) => s + 1)
      })
    },
    [completeStep, runWithErrorHandling],
  )

  /**
   * Step 5 "Mulai Pakai": mark everything complete, then dismiss.
   */
  const handleComplete = useCallback(async () => {
    await runWithErrorHandling(async () => {
      await completeAll()
      onComplete()
    })
  }, [completeAll, onComplete, runWithErrorHandling])

  /**
   * Back navigation — does NOT modify completedSteps (Requirement 2.6).
   */
  const handleBack = useCallback(() => {
    setError(null)
    setCurrentStep((s) => Math.max(0, s - 1))
  }, [])

  // ── Error overlay ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <ErrorOverlay
        message={error}
        onRetry={async () => {
          if (pendingAction) {
            await runWithErrorHandling(pendingAction)
          }
        }}
        onClose={onComplete}
        isLoading={isLoading}
      />
    )
  }

  // ── Step rendering ────────────────────────────────────────────────────────

  switch (currentStep) {
    case 0:
      return (
        <ElderStep1Welcome
          onNext={() => handleNext('elder-welcome')}
          isLoading={isLoading}
        />
      )
    case 1:
      return (
        <ElderStep2Clans
          onNext={() => handleNext('elder-clans')}
          onBack={handleBack}
          isLoading={isLoading}
        />
      )
    case 2:
      return (
        <ElderStep3Transactions
          onNext={() => handleNext('elder-transactions')}
          onBack={handleBack}
          isLoading={isLoading}
        />
      )
    case 3:
      return (
        <ElderStep4KioskIntro
          onNext={() => handleNext('elder-kiosk-intro')}
          onBack={handleBack}
          isLoading={isLoading}
        />
      )
    case 4:
    default:
      return (
        <ElderStep5Complete
          onNext={handleComplete}
          onBack={handleBack}
          isLoading={isLoading}
        />
      )
  }
}

// ── Error Overlay ─────────────────────────────────────────────────────────────

interface ErrorOverlayProps {
  message: string
  onRetry: () => Promise<void>
  onClose: () => void
  isLoading: boolean
}

/**
 * Shown inside the wizard when an IndexedDB write fails (Requirement 1.8).
 * Provides "Coba Lagi" (retry) and "Tutup" (close without persisting) actions.
 */
function ErrorOverlay({ message, onRetry, onClose, isLoading }: ErrorOverlayProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6"
    >
      <div className="bg-background border border-destructive rounded-xl shadow-lg max-w-sm w-full p-6 space-y-6">
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold text-destructive">
            Terjadi Kesalahan
          </h2>
        </div>

        {/* Error message */}
        <p className="text-lg text-center">{message}</p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onRetry}
            disabled={isLoading}
            className="kiosk-btn w-full"
            aria-label="Coba lagi menyimpan progres"
          >
            {isLoading ? 'Menyimpan...' : 'Coba Lagi'}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="kiosk-btn w-full"
            aria-label="Tutup wizard tanpa menyimpan"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}
