import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/auth/session'
import { db } from '@/db/local-db'
import { eldersRepo } from '@/db/repositories'
import { PARTICIPANT_STEPS, getResumeStep } from '@/onboarding/onboarding-state'
import { useOnboardingState } from '@/onboarding/useOnboardingState'
import type { OnboardingState } from '@/onboarding/onboarding-state'
import { ParticipantStep1Welcome } from '@/onboarding/steps/participant/ParticipantStep1Welcome'
import { ParticipantStep2Clan } from '@/onboarding/steps/participant/ParticipantStep2Clan'
import { ParticipantStep3Name } from '@/onboarding/steps/participant/ParticipantStep3Name'
import { ParticipantStep4Complete } from '@/onboarding/steps/participant/ParticipantStep4Complete'

interface ParticipantOnboardingWizardProps {
  state: OnboardingState | null
  onComplete: () => void
}

/**
 * Participant Onboarding Wizard — 4-step guided profile-completion flow.
 *
 * Orchestrates the four participant onboarding steps using the persist-before-
 * advance pattern: `completeStep(stepId)` must resolve (writing to IndexedDB)
 * before the local step index is incremented. IndexedDB write failures are
 * surfaced with retry/dismiss options (Requirement 1.8).
 *
 * Step sequence (PARTICIPANT_STEPS):
 *   0 — participant-welcome  → ParticipantStep1Welcome
 *   1 — participant-clan     → ParticipantStep2Clan
 *   2 — participant-name     → ParticipantStep3Name
 *   3 — participant-complete → ParticipantStep4Complete
 *
 * Validates: Requirements 4.1, 4.2, 1.5, 1.8
 */
export function ParticipantOnboardingWizard({
  state,
  onComplete,
}: ParticipantOnboardingWizardProps) {
  const { elder } = useAuth()
  const userId = elder?.id ?? ''

  const { completeStep, completeAll } = useOnboardingState(userId)

  // ── Local step index — initialized from resume logic ─────────────────────
  const [currentStep, setCurrentStep] = useState<number>(() =>
    getResumeStep(PARTICIPANT_STEPS, state?.completedSteps ?? [])
  )

  // ── Step 2: clan selection state ─────────────────────────────────────────
  const [selectedClanId, setSelectedClanId] = useState<string | null>(null)
  const [isClanSaving, setIsClanSaving] = useState(false)

  // ── Step 3: participant name lookup ──────────────────────────────────────
  const [participantName, setParticipantName] = useState<string | null>(null)
  const [isNameLoading, setIsNameLoading] = useState(false)

  // ── Error state for IndexedDB write failures (Requirement 1.8) ───────────
  const [writeError, setWriteError] = useState<string | null>(null)
  const [pendingStepAdvance, setPendingStepAdvance] = useState<(() => Promise<void>) | null>(null)
  const [isWriting, setIsWriting] = useState(false)

  // ── Lookup participant name when arriving at step 2 ──────────────────────
  useEffect(() => {
    if (currentStep !== 2 || !userId) return

    setIsNameLoading(true)
    db.participants
      .get(userId)
      .then((participant) => {
        setParticipantName(participant?.name ?? null)
      })
      .catch(() => {
        setParticipantName(null)
      })
      .finally(() => {
        setIsNameLoading(false)
      })
  }, [currentStep, userId])

  // ── Persist-before-advance: write completedStep then increment index ──────
  const advanceStep = useCallback(
    async (stepId: (typeof PARTICIPANT_STEPS)[number], nextIndex: number) => {
      setIsWriting(true)
      setWriteError(null)

      const doWrite = async () => {
        await completeStep(stepId)
        setCurrentStep(nextIndex)
        setIsWriting(false)
      }

      try {
        await doWrite()
      } catch {
        // IndexedDB write failed — surface error with retry/dismiss (Req 1.8)
        setIsWriting(false)
        setWriteError('Gagal menyimpan progres. Coba lagi?')
        setPendingStepAdvance(() => doWrite)
      }
    },
    [completeStep]
  )

  const handleRetry = useCallback(async () => {
    if (!pendingStepAdvance) return
    setIsWriting(true)
    setWriteError(null)
    try {
      await pendingStepAdvance()
      setPendingStepAdvance(null)
    } catch {
      setIsWriting(false)
      setWriteError('Gagal menyimpan progres. Coba lagi?')
    }
  }, [pendingStepAdvance])

  const handleDismissError = useCallback(() => {
    setWriteError(null)
    setPendingStepAdvance(null)
    setIsWriting(false)
  }, [])

  // ── Step 2: clan selection handler ───────────────────────────────────────
  const handleClanSelect = useCallback(
    async (clanId: string) => {
      if (!elder) return
      setSelectedClanId(clanId)
      setIsClanSaving(true)
      try {
        await eldersRepo.update(elder.id, { clan: clanId })
      } finally {
        setIsClanSaving(false)
      }
    },
    [elder]
  )

  // ── completeAll + onComplete for the final step ──────────────────────────
  const handleCompleteAll = useCallback(async () => {
    await completeAll()
  }, [completeAll])

  // ── Error overlay (Requirement 1.8) ──────────────────────────────────────
  if (writeError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 rounded-xl border border-destructive bg-destructive/10 p-6 space-y-4">
          <p role="alert" className="text-lg font-semibold text-destructive">
            {writeError}
          </p>
          <div className="flex gap-3">
            <button
              className="kiosk-btn flex-1 rounded-lg bg-primary text-primary-foreground"
              onClick={handleRetry}
              disabled={isWriting}
            >
              Coba Lagi
            </button>
            <button
              className="kiosk-btn flex-1 rounded-lg border border-input bg-background"
              onClick={handleDismissError}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step rendering ────────────────────────────────────────────────────────

  if (currentStep === 0) {
    return (
      <ParticipantStep1Welcome
        onNext={() => advanceStep('participant-welcome', 1)}
        isLoading={isWriting}
      />
    )
  }

  if (currentStep === 1) {
    return (
      <ParticipantStep2Clan
        onNext={() => advanceStep('participant-clan', 2)}
        onBack={() => setCurrentStep(0)}
        selectedClanId={selectedClanId}
        onClanSelect={handleClanSelect}
        isLoading={isWriting || isClanSaving}
      />
    )
  }

  if (currentStep === 2) {
    return (
      <ParticipantStep3Name
        onNext={() => advanceStep('participant-name', 3)}
        onBack={() => setCurrentStep(1)}
        participantName={participantName}
        isLoading={isWriting || isNameLoading}
      />
    )
  }

  // currentStep === 3
  return (
    <ParticipantStep4Complete
      onNext={onComplete}
      onBack={() => setCurrentStep(2)}
      completeAll={handleCompleteAll}
      isLoading={isWriting}
    />
  )
}
