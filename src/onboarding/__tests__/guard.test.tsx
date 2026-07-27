/**
 * Unit tests for OnboardingGuard.
 *
 * Validates: Requirements 1.3, 1.4, 2.1, 3.1, 4.1
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OnboardingGuard } from '@/onboarding/OnboardingGuard'
import type { OnboardingState } from '@/onboarding/onboarding-state'

// ─── Mock wizard components ───────────────────────────────────────────────────
//
// Each wizard is replaced with a simple labelled div so we can assert
// which (if any) wizard portal was mounted, without rendering real wizard logic.

vi.mock('@/onboarding/wizards/ElderOnboardingWizard', () => ({
  ElderOnboardingWizard: () => <div data-testid="elder-onboarding-wizard" />,
}))

vi.mock('@/onboarding/wizards/AdminSetupWizard', () => ({
  AdminSetupWizard: () => <div data-testid="admin-setup-wizard" />,
}))

vi.mock('@/onboarding/wizards/ParticipantOnboardingWizard', () => ({
  ParticipantOnboardingWizard: () => <div data-testid="participant-onboarding-wizard" />,
}))

// ─── Mock @/auth/session ──────────────────────────────────────────────────────

import { useAuth } from '@/auth/session'

vi.mock('@/auth/session', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

// ─── Mock @/onboarding/useOnboardingState ─────────────────────────────────────

import { useOnboardingState } from '@/onboarding/useOnboardingState'

vi.mock('@/onboarding/useOnboardingState', () => ({
  useOnboardingState: vi.fn(),
}))

const mockUseOnboardingState = vi.mocked(useOnboardingState)

const mockIncrementSessionCount = vi.fn()

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a minimal OnboardingState for testing. */
function makeState(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    userId: 'user-1',
    role: 'validator',
    completedSteps: [],
    isComplete: false,
    completedAt: null,
    skipped: false,
    skipSessionCount: 0,
    reminderDismissed: false,
    ...overrides,
  }
}

/** Sets up useAuth to return an elder with the given role. */
function setupAuth(role: 'validator' | 'superadmin' | 'participant') {
  mockUseAuth.mockReturnValue({
    elder: { id: 'user-1', role } as ReturnType<typeof useAuth>['elder'],
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  })
}

/** Sets up useOnboardingState to return the given state (not loading). */
function setupOnboardingState(
  state: OnboardingState | null,
  overrides?: Partial<ReturnType<typeof useOnboardingState>>,
) {
  mockUseOnboardingState.mockReturnValue({
    state,
    isLoading: false,
    completeStep: vi.fn(),
    completeAll: vi.fn(),
    skip: vi.fn(),
    dismissReminder: vi.fn(),
    incrementSessionCount: mockIncrementSessionCount,
    resetWizard: vi.fn(),
    ...overrides,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OnboardingGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIncrementSessionCount.mockResolvedValue(undefined)
  })

  // ── 1. Loading state ──────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders children immediately even while onboarding state is loading', () => {
      setupAuth('validator')
      mockUseOnboardingState.mockReturnValue({
        state: null,
        isLoading: true,
        completeStep: vi.fn(),
        completeAll: vi.fn(),
        skip: vi.fn(),
        dismissReminder: vi.fn(),
        incrementSessionCount: mockIncrementSessionCount,
        resetWizard: vi.fn(),
      })

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      // Children are always rendered (no blocking loading screen)
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
      // Wizard portal should NOT be shown while still loading (auth/state not resolved)
      expect(screen.queryByTestId('elder-onboarding-wizard')).not.toBeInTheDocument()
    })
  })

  // ── 2. No wizard when isComplete === true ─────────────────────────────────
  //
  // Validates: Requirement 1.3

  describe('when isComplete is true — no wizard portal should be mounted', () => {
    it('renders children and no wizard when state.isComplete is true (validator role)', () => {
      setupAuth('validator')
      setupOnboardingState(makeState({ isComplete: true }))

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
      expect(screen.queryByTestId('elder-onboarding-wizard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-setup-wizard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('participant-onboarding-wizard')).not.toBeInTheDocument()
    })

    it('renders children and no wizard when state.isComplete is true (superadmin role)', () => {
      setupAuth('superadmin')
      setupOnboardingState(makeState({ isComplete: true, role: 'superadmin' }))

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
      expect(screen.queryByTestId('admin-setup-wizard')).not.toBeInTheDocument()
    })

    it('renders children and no wizard when state.isComplete is true (participant role)', () => {
      setupAuth('participant')
      setupOnboardingState(makeState({ isComplete: true, role: 'participant' }))

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
      expect(screen.queryByTestId('participant-onboarding-wizard')).not.toBeInTheDocument()
    })
  })

  // ── 3. Role "validator" mounts ElderOnboardingWizard portal ──────────────
  //
  // Validates: Requirements 1.4, 2.1

  describe('role "validator" mounts ElderOnboardingWizard when wizard is needed', () => {
    it('mounts ElderOnboardingWizard when state is null (no prior record)', () => {
      setupAuth('validator')
      setupOnboardingState(null)

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('elder-onboarding-wizard')).toBeInTheDocument()
    })

    it('mounts ElderOnboardingWizard when isComplete is false', () => {
      setupAuth('validator')
      setupOnboardingState(makeState({ isComplete: false }))

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('elder-onboarding-wizard')).toBeInTheDocument()
    })

    it('does NOT mount AdminSetupWizard or ParticipantOnboardingWizard for validator', () => {
      setupAuth('validator')
      setupOnboardingState(null)

      render(
        <OnboardingGuard>
          <div />
        </OnboardingGuard>,
      )

      expect(screen.queryByTestId('admin-setup-wizard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('participant-onboarding-wizard')).not.toBeInTheDocument()
    })

    it('still renders children alongside the wizard portal', () => {
      setupAuth('validator')
      setupOnboardingState(null)

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      // Children remain in the DOM so the dashboard loads in the background
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument()
      expect(screen.getByTestId('elder-onboarding-wizard')).toBeInTheDocument()
    })
  })

  // ── 4. Role "superadmin" mounts AdminSetupWizard portal ──────────────────
  //
  // Validates: Requirements 1.4, 3.1
  // Note: the DB role is "superadmin" — there is no "admin" role in this codebase.

  describe('role "superadmin" mounts AdminSetupWizard when wizard is needed', () => {
    it('mounts AdminSetupWizard when state is null (no prior record)', () => {
      setupAuth('superadmin')
      setupOnboardingState(null)

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('admin-setup-wizard')).toBeInTheDocument()
    })

    it('mounts AdminSetupWizard when isComplete is false', () => {
      setupAuth('superadmin')
      setupOnboardingState(makeState({ isComplete: false, role: 'superadmin' }))

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('admin-setup-wizard')).toBeInTheDocument()
    })

    it('does NOT mount ElderOnboardingWizard or ParticipantOnboardingWizard for superadmin', () => {
      setupAuth('superadmin')
      setupOnboardingState(null)

      render(
        <OnboardingGuard>
          <div />
        </OnboardingGuard>,
      )

      expect(screen.queryByTestId('elder-onboarding-wizard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('participant-onboarding-wizard')).not.toBeInTheDocument()
    })
  })

  // ── 5. Role "participant" mounts ParticipantOnboardingWizard portal ───────
  //
  // Validates: Requirements 1.4, 4.1

  describe('role "participant" mounts ParticipantOnboardingWizard when wizard is needed', () => {
    it('mounts ParticipantOnboardingWizard when state is null', () => {
      setupAuth('participant')
      setupOnboardingState(null)

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('participant-onboarding-wizard')).toBeInTheDocument()
    })

    it('mounts ParticipantOnboardingWizard when isComplete is false', () => {
      setupAuth('participant')
      setupOnboardingState(makeState({ isComplete: false, role: 'participant' }))

      render(
        <OnboardingGuard>
          <div data-testid="dashboard-content" />
        </OnboardingGuard>,
      )

      expect(screen.getByTestId('participant-onboarding-wizard')).toBeInTheDocument()
    })

    it('does NOT mount other wizards for participant', () => {
      setupAuth('participant')
      setupOnboardingState(null)

      render(
        <OnboardingGuard>
          <div />
        </OnboardingGuard>,
      )

      expect(screen.queryByTestId('elder-onboarding-wizard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-setup-wizard')).not.toBeInTheDocument()
    })
  })

  // ── 6. incrementSessionCount called when state is skipped ─────────────────
  //
  // Validates: Requirement 1.7 (session-count reminder counter advances on each mount
  // when the user has skipped but not permanently dismissed onboarding)

  describe('incrementSessionCount is called on mount when state is skipped', () => {
    it('calls incrementSessionCount when skipped=true and isComplete=false', async () => {
      setupAuth('validator')
      setupOnboardingState(
        makeState({ skipped: true, isComplete: false }),
      )

      render(
        <OnboardingGuard>
          <div />
        </OnboardingGuard>,
      )

      await waitFor(() => {
        expect(mockIncrementSessionCount).toHaveBeenCalledTimes(1)
      })
    })

    it('does NOT call incrementSessionCount when skipped=false', async () => {
      setupAuth('validator')
      setupOnboardingState(
        makeState({ skipped: false, isComplete: false }),
      )

      render(
        <OnboardingGuard>
          <div />
        </OnboardingGuard>,
      )

      // Allow effects to flush
      await waitFor(() => {
        expect(mockIncrementSessionCount).not.toHaveBeenCalled()
      })
    })

    it('does NOT call incrementSessionCount when isComplete=true (even if skipped=true)', async () => {
      setupAuth('validator')
      setupOnboardingState(
        makeState({ skipped: true, isComplete: true }),
      )

      render(
        <OnboardingGuard>
          <div />
        </OnboardingGuard>,
      )

      await waitFor(() => {
        expect(mockIncrementSessionCount).not.toHaveBeenCalled()
      })
    })

    it('does NOT call incrementSessionCount when state is null', async () => {
      setupAuth('validator')
      setupOnboardingState(null)

      render(
        <OnboardingGuard>
          <div />
        </OnboardingGuard>,
      )

      await waitFor(() => {
        expect(mockIncrementSessionCount).not.toHaveBeenCalled()
      })
    })
  })
})
