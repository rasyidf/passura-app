import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SetupCompletenessBanner } from '@/components/layout/SetupCompletenessBanner'
import { OnboardingReminderBanner } from '@/components/layout/OnboardingReminderBanner'

// ─── Mock @/auth/session ──────────────────────────────────────────────────────

const mockUseAuth = vi.fn()
vi.mock('@/auth/session', () => ({
  useAuth: () => mockUseAuth(),
}))

// ─── Mock dexie-react-hooks ───────────────────────────────────────────────────

const mockUseLiveQuery = vi.fn()
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => unknown, deps: unknown[], defaultValue: unknown) =>
    mockUseLiveQuery(fn, deps, defaultValue),
}))

// ─── Mock @/db/local-db ───────────────────────────────────────────────────────

const mockAppConfigGet = vi.fn()
const mockAppConfigPut = vi.fn()
vi.mock('@/db/local-db', () => ({
  db: {
    appConfig: {
      get: (...args: unknown[]) => mockAppConfigGet(...args),
      put: (...args: unknown[]) => mockAppConfigPut(...args),
    },
    clans: { count: vi.fn() },
    animalTypes: { count: vi.fn() },
    groups: { count: vi.fn() },
  },
}))

// ─── Mock @/onboarding/useOnboardingState ─────────────────────────────────────

const mockDismissReminder = vi.fn()
const mockResetWizard = vi.fn()
const mockUseOnboardingState = vi.fn()
vi.mock('@/onboarding/useOnboardingState', () => ({
  useOnboardingState: (...args: unknown[]) => mockUseOnboardingState(...args),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSuperadminAuth() {
  return {
    elder: {
      id: 'user-1',
      role: 'superadmin' as const,
      name: 'Admin User',
      email: 'admin@test.com',
      passwordHash: 'hash',
      salt: 'salt',
      clan: 'clan-1',
      syncStatus: 'synced' as const,
    },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function buildValidatorAuth() {
  return {
    elder: {
      id: 'user-2',
      role: 'validator' as const,
      name: 'Validator User',
      email: 'validator@test.com',
      passwordHash: 'hash',
      salt: 'salt',
      clan: 'clan-1',
      syncStatus: 'synced' as const,
    },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }
}

function setupLiveCounts(clanCount: number, animalTypeCount: number, groupCount: number) {
  // useLiveQuery is called three times in BannerContent (clan, animalType, group)
  mockUseLiveQuery
    .mockReturnValueOnce(clanCount)
    .mockReturnValueOnce(animalTypeCount)
    .mockReturnValueOnce(groupCount)
}

// ─── SetupCompletenessBanner ──────────────────────────────────────────────────

describe('SetupCompletenessBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppConfigGet.mockResolvedValue(null)
    mockAppConfigPut.mockResolvedValue(undefined)
  })

  describe('role filtering', () => {
    it('does not render for role === "validator"', () => {
      mockUseAuth.mockReturnValue(buildValidatorAuth())
      const { container } = render(<SetupCompletenessBanner />)
      expect(container.firstChild).toBeNull()
    })

    it('renders for role === "superadmin" when setup is incomplete', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(0, 0, 0)
      render(<SetupCompletenessBanner />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('visibility based on counts', () => {
    it('shows the banner when clanCount is 0', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(0, 1, 1)
      render(<SetupCompletenessBanner />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('shows the banner when animalTypeCount is 0', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(1, 0, 1)
      render(<SetupCompletenessBanner />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('shows the banner when groupCount is 0', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(1, 1, 0)
      render(<SetupCompletenessBanner />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('shows the banner when all counts are 0', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(0, 0, 0)
      render(<SetupCompletenessBanner />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('does not render when all counts are >= 1', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(1, 1, 1)
      const { container } = render(<SetupCompletenessBanner />)
      expect(container.querySelector('[role="alert"]')).toBeNull()
    })

    it('does not render when counts are well above 1', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(5, 10, 3)
      const { container } = render(<SetupCompletenessBanner />)
      expect(container.querySelector('[role="alert"]')).toBeNull()
    })
  })

  describe('banner content', () => {
    it('contains descriptive incomplete setup message', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(0, 0, 0)
      render(<SetupCompletenessBanner />)
      expect(
        screen.getByText(/Pengaturan tenant belum lengkap/i),
      ).toBeInTheDocument()
    })

    it('contains "Lengkapi Pengaturan" button', () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(0, 1, 1)
      render(<SetupCompletenessBanner />)
      expect(
        screen.getByRole('button', { name: /Lengkapi Pengaturan/i }),
      ).toBeInTheDocument()
    })
  })

  describe('reopen wizard button', () => {
    it('updates existing onboarding record to isComplete: false when clicked', async () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(0, 0, 0)
      const existingState = {
        userId: 'user-1',
        role: 'superadmin',
        completedSteps: ['admin-welcome'],
        isComplete: true,
        completedAt: 12345,
        skipped: false,
        skipSessionCount: 0,
        reminderDismissed: false,
      }
      mockAppConfigGet.mockResolvedValue({
        key: 'onboarding-state',
        value: existingState,
      })

      render(<SetupCompletenessBanner />)
      fireEvent.click(screen.getByRole('button', { name: /Lengkapi Pengaturan/i }))

      await waitFor(() => {
        expect(mockAppConfigPut).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'onboarding-state',
            value: expect.objectContaining({ isComplete: false }),
          }),
        )
      })
    })

    it('creates a new onboarding record when none exists', async () => {
      mockUseAuth.mockReturnValue(buildSuperadminAuth())
      setupLiveCounts(0, 0, 0)
      mockAppConfigGet.mockResolvedValue(null)

      render(<SetupCompletenessBanner />)
      fireEvent.click(screen.getByRole('button', { name: /Lengkapi Pengaturan/i }))

      await waitFor(() => {
        expect(mockAppConfigPut).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'onboarding-state',
            value: expect.objectContaining({
              userId: 'user-1',
              role: 'superadmin',
              isComplete: false,
            }),
          }),
        )
      })
    })
  })
})

// ─── OnboardingReminderBanner ─────────────────────────────────────────────────

describe('OnboardingReminderBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDismissReminder.mockResolvedValue(undefined)
    mockResetWizard.mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue(buildSuperadminAuth())
  })

  function renderWithState(
    skipSessionCount: number,
    reminderDismissed: boolean,
    skipped = true,
  ) {
    mockUseOnboardingState.mockReturnValue({
      state: {
        userId: 'user-1',
        role: 'superadmin',
        completedSteps: [],
        isComplete: true,
        completedAt: 12345,
        skipped,
        skipSessionCount,
        reminderDismissed,
      },
      isLoading: false,
      dismissReminder: mockDismissReminder,
      resetWizard: mockResetWizard,
      completeStep: vi.fn(),
      completeAll: vi.fn(),
      skip: vi.fn(),
      incrementSessionCount: vi.fn(),
    })
  }

  describe('visibility', () => {
    it('shows the banner when skipSessionCount <= 7 and reminderDismissed is false', () => {
      renderWithState(0, false)
      render(<OnboardingReminderBanner />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('shows the banner at the boundary value skipSessionCount === 7', () => {
      renderWithState(7, false)
      render(<OnboardingReminderBanner />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('hides the banner when skipSessionCount === 8', () => {
      renderWithState(8, false)
      const { container } = render(<OnboardingReminderBanner />)
      expect(container.firstChild).toBeNull()
    })

    it('hides the banner when reminderDismissed is true', () => {
      renderWithState(3, true)
      const { container } = render(<OnboardingReminderBanner />)
      expect(container.firstChild).toBeNull()
    })

    it('hides the banner when both skipSessionCount > 7 and reminderDismissed is true', () => {
      renderWithState(10, true)
      const { container } = render(<OnboardingReminderBanner />)
      expect(container.firstChild).toBeNull()
    })

    it('hides the banner when state is null', () => {
      mockUseOnboardingState.mockReturnValue({
        state: null,
        isLoading: false,
        dismissReminder: mockDismissReminder,
        resetWizard: mockResetWizard,
        completeStep: vi.fn(),
        completeAll: vi.fn(),
        skip: vi.fn(),
        incrementSessionCount: vi.fn(),
      })
      const { container } = render(<OnboardingReminderBanner />)
      expect(container.firstChild).toBeNull()
    })

    it('hides the banner when skipped is false (user never skipped onboarding)', () => {
      renderWithState(0, false, false)
      const { container } = render(<OnboardingReminderBanner />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('"Tutup Selamanya" button calls dismissReminder()', () => {
    it('calls dismissReminder when the close button is clicked', async () => {
      renderWithState(3, false)
      render(<OnboardingReminderBanner />)

      const dismissBtn = screen.getByLabelText(/Tutup selamanya/i)
      fireEvent.click(dismissBtn)

      await waitFor(() => {
        expect(mockDismissReminder).toHaveBeenCalledTimes(1)
      })
    })

    it('does not call resetWizard when the close button is clicked', async () => {
      renderWithState(3, false)
      render(<OnboardingReminderBanner />)

      const dismissBtn = screen.getByLabelText(/Tutup selamanya/i)
      fireEvent.click(dismissBtn)

      await waitFor(() => {
        expect(mockResetWizard).not.toHaveBeenCalled()
      })
    })
  })

  describe('"Mulai Panduan" button calls resetWizard()', () => {
    it('calls resetWizard when the "Mulai Panduan" button is clicked', async () => {
      renderWithState(2, false)
      render(<OnboardingReminderBanner />)

      const startBtn = screen.getByRole('button', { name: /Mulai Panduan/i })
      fireEvent.click(startBtn)

      await waitFor(() => {
        expect(mockResetWizard).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('banner content', () => {
    it('contains reminder message text', () => {
      renderWithState(1, false)
      render(<OnboardingReminderBanner />)
      expect(
        screen.getByText(/Panduan onboarding tersedia/i),
      ).toBeInTheDocument()
    })
  })
})
