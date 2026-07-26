import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/session'
import { useOnboardingState } from '@/onboarding/useOnboardingState'
import { shouldShowWizard } from '@/onboarding/onboarding-state'
import type { OnboardingState } from '@/onboarding/onboarding-state'
import { ElderOnboardingWizard } from '@/onboarding/wizards/ElderOnboardingWizard'
import { AdminSetupWizard } from '@/onboarding/wizards/AdminSetupWizard'
import { ParticipantOnboardingWizard } from '@/onboarding/wizards/ParticipantOnboardingWizard'
import type { Elder } from '@/db/types'

// ─── Loading Screen ───────────────────────────────────────────────────────────

/**
 * Shown while onboarding state is being read from IndexedDB.
 */
function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}

// ─── Role → Wizard Mapping ────────────────────────────────────────────────────

type WizardComponent = React.ComponentType<{
  state: OnboardingState | null
  onComplete: () => void
}>

/**
 * Maps an elder's role to the appropriate onboarding wizard component.
 *
 * - `"validator"` → `ElderOnboardingWizard`
 * - `"superadmin"` (or `"admin"` if added to the type later) → `AdminSetupWizard`
 * - `"participant"` → `ParticipantOnboardingWizard`
 * - Any other role returns `null` (no wizard shown).
 *
 * Validates: Requirements 2.1, 3.1, 4.1
 */
export function getWizardForRole(
  role: Elder['role'] | undefined,
): WizardComponent | null {
  switch (role) {
    case 'validator':
      return ElderOnboardingWizard
    case 'superadmin':
      return AdminSetupWizard
    case 'participant':
      return ParticipantOnboardingWizard
    default:
      return null
  }
}

// ─── OnboardingGuard ──────────────────────────────────────────────────────────

interface OnboardingGuardProps {
  children: React.ReactNode
}

/**
 * Route-level guard that conditionally overlays the appropriate onboarding
 * wizard as a React portal over `document.body` at `z-50`.
 *
 * Behaviour:
 * - Shows `LoadingScreen` while `useOnboardingState` is loading from IndexedDB.
 * - When `shouldShowWizard(state)` returns `true`, mounts the role-appropriate
 *   wizard via `createPortal(…, document.body)`.
 * - When the wizard is not needed (state is complete), renders only `{children}`.
 * - On each mount, calls `incrementSessionCount()` when the user has skipped
 *   onboarding but has not yet completed it, so the 7-session reminder counter
 *   advances correctly (Requirement 1.7).
 *
 * The wizard is automatically dismissed (portal unmounts) as soon as
 * `state.isComplete` becomes `true`, because `useOnboardingState` returns
 * reactive state — no explicit dismiss callback is needed by the guard.
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 2.1, 3.1, 4.1
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { elder } = useAuth()
  const { state, isLoading, incrementSessionCount } = useOnboardingState(
    elder?.id ?? '',
  )

  // Increment session count on mount when user has skipped but not completed
  // (Requirement 1.7 — advances the 7-session reminder counter)
  useEffect(() => {
    if (state !== null && state.skipped === true && !state.isComplete) {
      incrementSessionCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elder?.id])

  if (isLoading) {
    return <LoadingScreen />
  }

  const WizardComponent = shouldShowWizard(state)
    ? getWizardForRole(elder?.role)
    : null

  return (
    <>
      {children}
      {WizardComponent &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <WizardComponent state={state} onComplete={() => {}} />
          </div>,
          document.body,
        )}
    </>
  )
}
