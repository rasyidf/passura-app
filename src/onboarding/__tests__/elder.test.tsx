/**
 * Unit tests for ElderOnboardingWizard.
 *
 * Validates: Requirements 2.5, 2.6, 1.8
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ElderOnboardingWizard } from '@/onboarding/wizards/ElderOnboardingWizard'
import type { OnboardingState } from '@/onboarding/onboarding-state'

// ─── Mock @/auth/session ──────────────────────────────────────────────────────

vi.mock('@/auth/session', () => ({
  useAuth: vi.fn(() => ({
    elder: { id: 'elder-1', role: 'validator' },
  })),
}))

// ─── Mock @/db/local-db ───────────────────────────────────────────────────────

const appConfigStore = new Map<string, unknown>()

vi.mock('@/db/local-db', () => ({
  db: {
    appConfig: {
      get: vi.fn(async (key: string) => {
        const value = appConfigStore.get(key)
        return value !== undefined ? { key, value } : undefined
      }),
      put: vi.fn(async ({ key, value }: { key: string; value: unknown }) => {
        appConfigStore.set(key, value)
      }),
      delete: vi.fn(async (key: string) => {
        appConfigStore.delete(key)
      }),
    },
  },
}))

// ─── Mock @/onboarding/useOnboardingState ─────────────────────────────────────
//
// We control what the hook returns so we can observe calls and inject failures
// without going through the real IndexedDB write queue.

const mockCompleteStep = vi.fn()
const mockCompleteAll = vi.fn()

vi.mock('@/onboarding/useOnboardingState', () => ({
  useOnboardingState: vi.fn(() => ({
    state: null,
    isLoading: false,
    completeStep: mockCompleteStep,
    completeAll: mockCompleteAll,
    skip: vi.fn(),
    dismissReminder: vi.fn(),
    incrementSessionCount: vi.fn(),
    resetWizard: vi.fn(),
  })),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a minimal OnboardingState with the given completedSteps. */
function makeState(completedSteps: string[]): OnboardingState {
  return {
    userId: 'elder-1',
    role: 'validator',
    completedSteps,
    isComplete: false,
    completedAt: null,
    skipped: false,
    skipSessionCount: 0,
    reminderDismissed: false,
  }
}

const noop = () => {}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ElderOnboardingWizard', () => {
  beforeEach(() => {
    appConfigStore.clear()
    vi.clearAllMocks()
    // Default: completeStep resolves immediately (happy path)
    mockCompleteStep.mockResolvedValue(undefined)
    mockCompleteAll.mockResolvedValue(undefined)
  })

  // ── 1. Resume from partial completedSteps ────────────────────────────────
  //
  // Validates: Requirement 1.5 (getResumeStep drives the initial currentStep)

  describe('renders the correct step on resume from partial completedSteps', () => {
    it('starts at Step 1 (Selamat Datang!) when no steps are completed', () => {
      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)
      expect(screen.getByRole('heading', { name: 'Selamat Datang!' })).toBeInTheDocument()
    })

    it('starts at Step 2 (Apa itu Clan?) when elder-welcome is completed', () => {
      render(
        <ElderOnboardingWizard
          state={makeState(['elder-welcome'])}
          onComplete={noop}
        />,
      )
      expect(screen.getByRole('heading', { name: 'Apa itu Clan?' })).toBeInTheDocument()
    })

    it('starts at Step 3 (Pencatatan Transaksi) when first two steps are completed', () => {
      render(
        <ElderOnboardingWizard
          state={makeState(['elder-welcome', 'elder-clans'])}
          onComplete={noop}
        />,
      )
      expect(
        screen.getByRole('heading', { name: 'Pencatatan Transaksi' }),
      ).toBeInTheDocument()
    })

    it('starts at Step 4 (Mode Kios) when first three steps are completed', () => {
      render(
        <ElderOnboardingWizard
          state={makeState(['elder-welcome', 'elder-clans', 'elder-transactions'])}
          onComplete={noop}
        />,
      )
      expect(screen.getByRole('heading', { name: 'Mode Kios' })).toBeInTheDocument()
    })

    it('starts at Step 5 (Siap Digunakan!) when all but the last step are completed', () => {
      render(
        <ElderOnboardingWizard
          state={makeState([
            'elder-welcome',
            'elder-clans',
            'elder-transactions',
            'elder-kiosk-intro',
          ])}
          onComplete={noop}
        />,
      )
      expect(screen.getByRole('heading', { name: 'Siap Digunakan!' })).toBeInTheDocument()
    })

    it('renders Step 1 when state prop is null (fresh start)', () => {
      render(<ElderOnboardingWizard state={null} onComplete={noop} />)
      expect(screen.getByRole('heading', { name: 'Selamat Datang!' })).toBeInTheDocument()
    })
  })

  // ── 2. "Lanjut" is disabled during pending IndexedDB write ───────────────
  //
  // Validates: Requirement 2.5 (step must not advance while write is in flight)

  describe('"Lanjut" is disabled during a pending IndexedDB write', () => {
    it('disables the Lanjut button while completeStep has not resolved', async () => {
      // Make completeStep return a promise that never resolves — simulates a
      // stalled IndexedDB write so we can observe the disabled state.
      let resolveWrite!: () => void
      mockCompleteStep.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveWrite = resolve
        }),
      )

      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)

      const nextButton = screen.getByRole('button', { name: /lanjut|mulai/i })
      expect(nextButton).not.toBeDisabled()

      // Trigger the next-step action
      fireEvent.click(nextButton)

      // While the write is pending, the button should be disabled (isLoading=true)
      await waitFor(() => {
        expect(nextButton).toBeDisabled()
      })

      // Let the write resolve. The wizard will advance to the next step,
      // so re-query for any forward-navigation button (it will no longer be disabled).
      resolveWrite()
      await waitFor(() => {
        // After the resolved write the wizard advances; query fresh so we get
        // the newly rendered button rather than the stale reference.
        const forwardButton = screen.queryByRole('button', { name: /lanjut|mulai pakai/i })
        expect(forwardButton).not.toBeNull()
        expect(forwardButton).not.toBeDisabled()
      })
    })

    it('shows "Memuat…" label on the forward button while write is pending', async () => {
      let resolveWrite!: () => void
      mockCompleteStep.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveWrite = resolve
        }),
      )

      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)

      // Click the Lanjut button to begin the write
      fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

      // While pending the button label should change to the loading indicator
      await waitFor(() => {
        expect(screen.getByText('Memuat…')).toBeInTheDocument()
      })

      resolveWrite()
    })
  })

  // ── 3. "Kembali" navigates back without changing completedSteps ──────────
  //
  // Validates: Requirement 2.6 (back navigation must NOT call completeStep)

  describe('"Kembali" navigates back without touching completedSteps', () => {
    it('moves the wizard back one step when Kembali is clicked', () => {
      // Start at step 2 so Kembali is visible
      render(
        <ElderOnboardingWizard
          state={makeState(['elder-welcome'])}
          onComplete={noop}
        />,
      )

      // We are on Step 2 — "Apa itu Clan?"
      expect(screen.getByRole('heading', { name: 'Apa itu Clan?' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /kembali/i }))

      // Should go back to Step 1
      expect(screen.getByRole('heading', { name: 'Selamat Datang!' })).toBeInTheDocument()
    })

    it('does NOT call completeStep when Kembali is clicked', () => {
      render(
        <ElderOnboardingWizard
          state={makeState(['elder-welcome'])}
          onComplete={noop}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: /kembali/i }))

      expect(mockCompleteStep).not.toHaveBeenCalled()
    })

    it('does not navigate below step 0 when back is triggered on step 1', async () => {
      // Step 1 has no back button — clicking back on step 2 then confirming
      // we can't go below 0 by pressing back again after navigating forward.
      render(
        <ElderOnboardingWizard
          state={makeState(['elder-welcome', 'elder-clans'])}
          onComplete={noop}
        />,
      )

      // Step 3 — back → Step 2
      fireEvent.click(screen.getByRole('button', { name: /kembali/i }))
      expect(screen.getByRole('heading', { name: 'Apa itu Clan?' })).toBeInTheDocument()

      // Step 2 — back → Step 1
      fireEvent.click(screen.getByRole('button', { name: /kembali/i }))
      expect(screen.getByRole('heading', { name: 'Selamat Datang!' })).toBeInTheDocument()

      // Step 1 has no Kembali button
      expect(screen.queryByRole('button', { name: /kembali/i })).not.toBeInTheDocument()
    })
  })

  // ── 4. IndexedDB failure shows error state with retry button ─────────────
  //
  // Validates: Requirement 1.8

  describe('IndexedDB failure shows error state with retry button', () => {
    it('shows "Terjadi Kesalahan" heading when completeStep rejects', async () => {
      mockCompleteStep.mockRejectedValue(new Error('IDB quota exceeded'))

      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)

      fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Terjadi Kesalahan' })).toBeInTheDocument()
      })
    })

    it('shows error message text when write fails', async () => {
      mockCompleteStep.mockRejectedValue(new Error('IDB quota exceeded'))

      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)

      fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

      await waitFor(() => {
        expect(
          screen.getByText('Gagal menyimpan progres. Coba lagi?'),
        ).toBeInTheDocument()
      })
    })

    it('shows "Coba Lagi" retry button in the error overlay', async () => {
      mockCompleteStep.mockRejectedValue(new Error('IDB quota exceeded'))

      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)

      fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /coba lagi/i }),
        ).toBeInTheDocument()
      })
    })

    it('shows a "Tutup" close button in the error overlay', async () => {
      mockCompleteStep.mockRejectedValue(new Error('IDB quota exceeded'))

      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)

      fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /tutup/i }),
        ).toBeInTheDocument()
      })
    })

    it('retries the write when "Coba Lagi" is clicked and succeeds', async () => {
      // First call rejects, second call resolves
      mockCompleteStep
        .mockRejectedValueOnce(new Error('IDB quota exceeded'))
        .mockResolvedValueOnce(undefined)

      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)

      fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

      // Wait for error overlay
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument()
      })

      // Retry
      fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }))

      // Error overlay should disappear and we advance to Step 2
      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: 'Terjadi Kesalahan' }),
        ).not.toBeInTheDocument()
        expect(
          screen.getByRole('heading', { name: 'Apa itu Clan?' }),
        ).toBeInTheDocument()
      })
    })

    it('calls onComplete when "Tutup" is clicked in the error overlay', async () => {
      mockCompleteStep.mockRejectedValue(new Error('IDB quota exceeded'))
      const onComplete = vi.fn()

      render(<ElderOnboardingWizard state={makeState([])} onComplete={onComplete} />)

      fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tutup/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /tutup/i }))

      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('uses role="alert" on the error overlay for screen-reader accessibility', async () => {
      mockCompleteStep.mockRejectedValue(new Error('IDB error'))

      render(<ElderOnboardingWizard state={makeState([])} onComplete={noop} />)

      fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })
})
