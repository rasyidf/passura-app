import { useState, useCallback } from 'react'
import { useAuth } from '@/auth/session'
import { useOnboardingState } from '@/onboarding/useOnboardingState'
import { ADMIN_STEPS, getResumeStep } from '@/onboarding/onboarding-state'
import type { OnboardingState } from '@/onboarding/onboarding-state'
import { AdminStep1Welcome } from '@/onboarding/steps/admin/AdminStep1Welcome'
import { AdminStep2Clans } from '@/onboarding/steps/admin/AdminStep2Clans'
import { AdminStep3AnimalTypes } from '@/onboarding/steps/admin/AdminStep3AnimalTypes'
import { AdminStep4Groups } from '@/onboarding/steps/admin/AdminStep4Groups'
import { AdminStep5Elders } from '@/onboarding/steps/admin/AdminStep5Elders'
import { AdminStep6Complete } from '@/onboarding/steps/admin/AdminStep6Complete'

interface AdminSetupWizardProps {
  state: OnboardingState | null
  onComplete: () => void
}

/**
 * Six-step Admin Setup Wizard.
 *
 * - Resumes from the first incomplete step using `getResumeStep`.
 * - Persists each completed step to IndexedDB via `completeStep` BEFORE
 *   advancing the local step index (Property 2 / Requirement 1.1).
 * - Handles IndexedDB write errors with an inline retry / dismiss UI
 *   (Requirement 1.8).
 * - Final step calls `completeAll()` then `onComplete()` (Requirement 3.8).
 *
 * Validates: Requirements 3.1, 3.7, 3.8, 1.8
 */
export function AdminSetupWizard({ state, onComplete }: AdminSetupWizardProps) {
  const { elder } = useAuth()
  const { completeStep, completeAll } = useOnboardingState(elder?.id ?? '')

  // Resume from first incomplete step (or step 0 if no prior progress)
  const [currentStep, setCurrentStep] = useState<number>(() =>
    getResumeStep(ADMIN_STEPS, state?.completedSteps ?? []),
  )

  // IndexedDB write error state for Requirement 1.8
  const [writeError, setWriteError] = useState<string | null>(null)
  const [isPersisting, setIsPersisting] = useState(false)
  // Pending retry callback when a write fails
  const [pendingRetry, setPendingRetry] = useState<(() => Promise<void>) | null>(null)

  // ── Shared advance handler ────────────────────────────────────────────────

  /**
   * Persists `stepId` via `completeStep`, then advances `currentStep` by 1.
   * On IndexedDB failure, surfaces the error UI and stores a retry callback.
   */
  const advanceAfterPersist = useCallback(
    async (stepId: string) => {
      setIsPersisting(true)
      setWriteError(null)
      setPendingRetry(null)

      const doWrite = async () => {
        try {
          await completeStep(stepId)
          setCurrentStep((s) => s + 1)
          setWriteError(null)
          setPendingRetry(null)
        } catch {
          setWriteError('Gagal menyimpan progres. Coba lagi?')
          // Store a retry thunk so the user can re-attempt
          setPendingRetry(() => doWrite)
        } finally {
          setIsPersisting(false)
        }
      }

      await doWrite()
    },
    [completeStep],
  )

  // ── Final step handler ────────────────────────────────────────────────────

  /**
   * Called by the last step (AdminStep6Complete).
   * Calls `completeAll()` to set `isComplete: true`, then invokes `onComplete`.
   */
  const handleFinalStep = useCallback(async () => {
    setIsPersisting(true)
    setWriteError(null)
    setPendingRetry(null)

    const doFinal = async () => {
      try {
        await completeAll()
        onComplete()
      } catch {
        setWriteError('Gagal menyimpan progres. Coba lagi?')
        setPendingRetry(() => doFinal)
      } finally {
        setIsPersisting(false)
      }
    }

    await doFinal()
  }, [completeAll, onComplete])

  // ── Back navigation ───────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    setWriteError(null)
    setPendingRetry(null)
    setCurrentStep((s) => Math.max(0, s - 1))
  }, [])

  // ── Error UI overlay ──────────────────────────────────────────────────────

  if (writeError) {
    return (
      <div
        className="flex flex-col w-full max-w-2xl max-h-[600px] bg-background rounded-xl shadow-lg border border-destructive mx-auto overflow-hidden"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="write-error-heading"
        aria-describedby="write-error-body"
      >
        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-10">
          <h2
            id="write-error-heading"
            className="kiosk-h1 text-destructive text-center"
          >
            Gagal Menyimpan
          </h2>
          <p id="write-error-body" className="text-lg text-center">
            {writeError}
          </p>
        </div>

        {/* Actions footer */}
        <div className="px-8 py-5 shrink-0 border-t border-border bg-background">
          <div className="flex gap-4">
            <button
              type="button"
              className="kiosk-btn flex-1 rounded-md bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[filter]"
              onClick={() => pendingRetry?.()}
              disabled={isPersisting}
            >
              {isPersisting ? 'Menyimpan…' : 'Coba Lagi'}
            </button>
            <button
              type="button"
              className="kiosk-btn flex-1 rounded-md border border-input bg-background hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              onClick={() => {
                setWriteError(null)
                setPendingRetry(null)
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step renderer ─────────────────────────────────────────────────────────

  switch (currentStep) {
    case 0:
      return (
        <AdminStep1Welcome
          onNext={() => advanceAfterPersist(ADMIN_STEPS[0])}
          isLoading={isPersisting}
        />
      )

    case 1:
      return (
        <AdminStep2Clans
          onNext={() => advanceAfterPersist(ADMIN_STEPS[1])}
          onBack={handleBack}
          isLoading={isPersisting}
        />
      )

    case 2:
      return (
        <AdminStep3AnimalTypes
          onNext={() => advanceAfterPersist(ADMIN_STEPS[2])}
          onBack={handleBack}
          isLoading={isPersisting}
        />
      )

    case 3:
      return (
        <AdminStep4Groups
          onNext={() => advanceAfterPersist(ADMIN_STEPS[3])}
          onBack={handleBack}
          isLoading={isPersisting}
        />
      )

    case 4:
      return (
        <AdminStep5Elders
          onNext={() => advanceAfterPersist(ADMIN_STEPS[4])}
          onBack={handleBack}
          isLoading={isPersisting}
        />
      )

    case 5:
    default:
      return (
        <AdminStep6Complete
          onNext={handleFinalStep}
          onBack={handleBack}
          isLoading={isPersisting}
        />
      )
  }
}
