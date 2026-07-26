/**
 * Unit tests for ParticipantOnboardingWizard.
 *
 * Validates: Requirements 4.3, 4.4, 4.5
 *
 * Test coverage:
 *  - Step 2 no-clans case: shows skip message, hides ClanPicker
 *  - Step 3 no-participant case: shows skip message
 *  - Clan selection updates the elder record in IndexedDB via eldersRepo.update
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ParticipantStep2Clan } from '@/onboarding/steps/participant/ParticipantStep2Clan'
import { ParticipantStep3Name } from '@/onboarding/steps/participant/ParticipantStep3Name'
import { ParticipantOnboardingWizard } from '@/onboarding/wizards/ParticipantOnboardingWizard'
import type { OnboardingState } from '@/onboarding/onboarding-state'
import type { Clan } from '@/db/types'

// ─── Mock @/auth/session ──────────────────────────────────────────────────────

const mockElder = { id: 'elder-participant-1', role: 'participant' as const }

vi.mock('@/auth/session', () => ({
  useAuth: vi.fn(() => ({
    elder: mockElder,
  })),
}))

// ─── Mock @/db/local-db ───────────────────────────────────────────────────────
//
// We need to control what `db.clans.toArray()` returns (for useLiveQuery in
// ParticipantStep2Clan) and what `db.participants.get()` returns (wizard Step 3
// name lookup). The appConfig store is used by useOnboardingState.

const appConfigStore = new Map<string, unknown>()
let mockClans: Clan[] = []
let mockParticipant: { id: string; name: string } | undefined = undefined

vi.mock('@/db/local-db', () => ({
  db: {
    clans: {
      toArray: vi.fn(async () => mockClans),
    },
    participants: {
      get: vi.fn(async (_id: string) => mockParticipant),
    },
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

// ─── Mock dexie-react-hooks ───────────────────────────────────────────────────
//
// useLiveQuery is used by ParticipantStep2Clan to load clans. We make it call
// the async factory synchronously so the component receives the data immediately
// in tests without needing act() around async Dexie subscriptions.

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn((factory: () => unknown) => {
    // Synchronously run the factory once. This mirrors the resolved state of
    // useLiveQuery (data available, not in loading state).
    try {
      // Factories may be async; return the result. If it's a Promise, React
      // state will remain undefined (loading) — but our mock clans are plain
      // arrays so this returns the value immediately.
      const result = factory()
      // For tests, if the factory returns a Promise, fall back to the current
      // mockClans value directly so tests remain synchronous.
      if (result instanceof Promise) {
        return mockClans
      }
      return result
    } catch {
      return undefined
    }
  }),
}))

// ─── Mock @/onboarding/useOnboardingState ─────────────────────────────────────

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

// ─── Mock @/db/repositories ───────────────────────────────────────────────────
//
// We observe calls to eldersRepo.update to verify clan selection persists.
// Use vi.hoisted so the variable is available inside the hoisted vi.mock factory.

const { mockEldersUpdate } = vi.hoisted(() => ({
  mockEldersUpdate: vi.fn(),
}))

vi.mock('@/db/repositories', () => ({
  eldersRepo: {
    update: mockEldersUpdate,
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(completedSteps: string[]): OnboardingState {
  return {
    userId: mockElder.id,
    role: 'participant',
    completedSteps,
    isComplete: false,
    completedAt: null,
    skipped: false,
    skipSessionCount: 0,
    reminderDismissed: false,
  }
}

function makeClan(id: string, name: string): Clan {
  return {
    id,
    name,
    region: null,
    lineageHead: null,
    syncStatus: 'local',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

const noop = () => {}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ParticipantStep2Clan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClans = []
    mockCompleteStep.mockResolvedValue(undefined)
    mockCompleteAll.mockResolvedValue(undefined)
  })

  // ── Requirement 4.4 ──────────────────────────────────────────────────────
  // When no clans exist, show skip message and no clan picker.

  describe('no-clans case (Requirement 4.4)', () => {
    it('shows "Belum ada rumpun keluarga yang terdaftar. Hubungi admin Anda." when no clans', () => {
      mockClans = [] // explicitly empty

      render(
        <ParticipantStep2Clan
          onNext={noop}
          onBack={noop}
          selectedClanId={null}
        />,
      )

      expect(
        screen.getByText('Belum ada rumpun keluarga yang terdaftar. Hubungi admin Anda.'),
      ).toBeInTheDocument()
    })

    it('does NOT render the ClanPicker listbox when there are no clans', () => {
      mockClans = []

      render(
        <ParticipantStep2Clan
          onNext={noop}
          onBack={noop}
          selectedClanId={null}
        />,
      )

      // ClanPicker renders a role="listbox"; it should be absent when no clans
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('shows "Lewati" as the next button label when no clans', () => {
      mockClans = []

      render(
        <ParticipantStep2Clan
          onNext={noop}
          onBack={noop}
          selectedClanId={null}
        />,
      )

      expect(screen.getByRole('button', { name: /lewati/i })).toBeInTheDocument()
    })

    it('next button is not disabled when there are no clans (skip is allowed)', () => {
      mockClans = []

      render(
        <ParticipantStep2Clan
          onNext={noop}
          onBack={noop}
          selectedClanId={null}
        />,
      )

      expect(screen.getByRole('button', { name: /lewati/i })).not.toBeDisabled()
    })
  })

  // ── Clans present ─────────────────────────────────────────────────────────

  describe('clans-present case', () => {
    it('renders the ClanPicker listbox when clans exist', () => {
      mockClans = [makeClan('clan-1', 'Clan Alpha')]

      render(
        <ParticipantStep2Clan
          onNext={noop}
          onBack={noop}
          selectedClanId={null}
        />,
      )

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('does NOT show the no-clans message when clans are present', () => {
      mockClans = [makeClan('clan-1', 'Clan Alpha')]

      render(
        <ParticipantStep2Clan
          onNext={noop}
          onBack={noop}
          selectedClanId={null}
        />,
      )

      expect(
        screen.queryByText('Belum ada rumpun keluarga yang terdaftar. Hubungi admin Anda.'),
      ).not.toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('ParticipantStep3Name', () => {
  // ── Requirement 4.5 ──────────────────────────────────────────────────────
  // When no participant record found, show skip message.

  describe('no-participant case (Requirement 4.5)', () => {
    it('shows "Nama Anda belum terdaftar. Hubungi admin Anda." when participantName is null', () => {
      render(
        <ParticipantStep3Name
          onNext={noop}
          onBack={noop}
          participantName={null}
        />,
      )

      expect(
        screen.getByText('Nama Anda belum terdaftar. Hubungi admin Anda.'),
      ).toBeInTheDocument()
    })

    it('shows "Lewati" as the next button label when no participant', () => {
      render(
        <ParticipantStep3Name
          onNext={noop}
          onBack={noop}
          participantName={null}
        />,
      )

      expect(screen.getByRole('button', { name: /lewati/i })).toBeInTheDocument()
    })

    it('next button is not disabled when participant is null (skip is allowed)', () => {
      render(
        <ParticipantStep3Name
          onNext={noop}
          onBack={noop}
          participantName={null}
        />,
      )

      expect(screen.getByRole('button', { name: /lewati/i })).not.toBeDisabled()
    })
  })

  // ── Participant found ─────────────────────────────────────────────────────

  describe('participant found', () => {
    it('shows the participant name when participantName is provided', () => {
      render(
        <ParticipantStep3Name
          onNext={noop}
          onBack={noop}
          participantName="Budi Santoso"
        />,
      )

      expect(screen.getByText('Budi Santoso')).toBeInTheDocument()
    })

    it('does NOT show the not-registered message when a name is present', () => {
      render(
        <ParticipantStep3Name
          onNext={noop}
          onBack={noop}
          participantName="Budi Santoso"
        />,
      )

      expect(
        screen.queryByText('Nama Anda belum terdaftar. Hubungi admin Anda.'),
      ).not.toBeInTheDocument()
    })

    it('shows "Lanjut" as the next button label when name is present', () => {
      render(
        <ParticipantStep3Name
          onNext={noop}
          onBack={noop}
          participantName="Budi Santoso"
        />,
      )

      expect(screen.getByRole('button', { name: /lanjut/i })).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('ParticipantOnboardingWizard — clan selection updates elder record', () => {
  beforeEach(() => {
    appConfigStore.clear()
    vi.clearAllMocks()
    mockClans = [makeClan('clan-42', 'Clan Toraja')]
    mockParticipant = { id: mockElder.id, name: 'Test User' }
    mockCompleteStep.mockResolvedValue(undefined)
    mockCompleteAll.mockResolvedValue(undefined)
    mockEldersUpdate.mockResolvedValue(undefined)
  })

  // Navigate to step 1 (0-indexed) which is ParticipantStep2Clan
  // by rendering the wizard with 'participant-welcome' already completed.

  it('calls eldersRepo.update with the selected clan id when a clan is chosen (Requirement 4.3)', async () => {
    render(
      <ParticipantOnboardingWizard
        state={makeState(['participant-welcome'])}
        onComplete={noop}
      />,
    )

    // We should be on step 2 — "Pilih Rumpun Keluarga Anda"
    expect(screen.getByRole('heading', { name: 'Pilih Rumpun Keluarga Anda' })).toBeInTheDocument()

    // The ClanPicker renders clan options as role="option" items
    const clanOption = screen.getByRole('option', { name: 'Clan Toraja' })
    fireEvent.click(clanOption)

    await waitFor(() => {
      expect(mockEldersUpdate).toHaveBeenCalledWith(mockElder.id, { clan: 'clan-42' })
    })
  })

  it('calls eldersRepo.update exactly once per clan selection click', async () => {
    render(
      <ParticipantOnboardingWizard
        state={makeState(['participant-welcome'])}
        onComplete={noop}
      />,
    )

    const clanOption = screen.getByRole('option', { name: 'Clan Toraja' })
    fireEvent.click(clanOption)

    await waitFor(() => {
      expect(mockEldersUpdate).toHaveBeenCalledTimes(1)
    })
  })
})
