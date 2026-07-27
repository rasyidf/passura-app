/**
 * Unit tests for AdminSetupWizard and its individual step components.
 *
 * Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminSetupWizard } from '@/onboarding/wizards/AdminSetupWizard'
import { AdminStep2Clans } from '@/onboarding/steps/admin/AdminStep2Clans'
import { AdminStep3AnimalTypes } from '@/onboarding/steps/admin/AdminStep3AnimalTypes'
import { AdminStep4Groups } from '@/onboarding/steps/admin/AdminStep4Groups'
import type { OnboardingState } from '@/onboarding/onboarding-state'
import type { Clan, AnimalType, Group } from '@/db/types'

// ─── Mock @/auth/session ──────────────────────────────────────────────────────

vi.mock('@/auth/session', () => ({
  useAuth: vi.fn(() => ({
    elder: { id: 'admin-1', role: 'superadmin', name: 'Admin Test' },
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
// In-memory stores so each step component can call getAll/create without IDB.
// The stores are module-level objects; we clear their contents in beforeEach
// rather than reassigning (so the mock closures always reference the same array).

const clansStore: Clan[] = []
const animalTypesStore: AnimalType[] = []
const groupsStore: Group[] = []

const makeEntity = <T extends object>(data: T, id: string) => ({
  ...data,
  id,
  syncStatus: 'local' as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

vi.mock('@/db/repositories', () => ({
  clansRepo: {
    getAll: vi.fn(async () => [...clansStore]),
    create: vi.fn(async (data: Omit<Clan, 'id' | 'syncStatus' | 'createdAt' | 'updatedAt'>) => {
      const created = makeEntity(data, `clan-${clansStore.length + 1}`) as Clan
      clansStore.push(created)
      return created
    }),
    count: vi.fn(async () => clansStore.length),
  },
  animalTypesRepo: {
    getAll: vi.fn(async () => [...animalTypesStore]),
    create: vi.fn(
      async (data: Omit<AnimalType, 'id' | 'syncStatus' | 'createdAt' | 'updatedAt'>) => {
        const created = makeEntity(data, `at-${animalTypesStore.length + 1}`) as AnimalType
        animalTypesStore.push(created)
        return created
      },
    ),
    count: vi.fn(async () => animalTypesStore.length),
  },
  groupsRepo: {
    getAll: vi.fn(async () => [...groupsStore]),
    create: vi.fn(async (data: Omit<Group, 'id' | 'syncStatus' | 'createdAt' | 'updatedAt'>) => {
      const created = makeEntity(data, `grp-${groupsStore.length + 1}`) as Group
      groupsStore.push(created)
      return created
    }),
    count: vi.fn(async () => groupsStore.length),
  },
  eldersRepo: {
    getAll: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a minimal OnboardingState with the given completedSteps. */
function makeState(completedSteps: string[]): OnboardingState {
  return {
    userId: 'admin-1',
    role: 'superadmin',
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

describe('AdminSetupWizard', () => {
  beforeEach(() => {
    appConfigStore.clear()
    clansStore.length = 0
    animalTypesStore.length = 0
    groupsStore.length = 0
    vi.clearAllMocks()
    mockCompleteStep.mockResolvedValue(undefined)
    mockCompleteAll.mockResolvedValue(undefined)
  })

  // ── 1. Resume from partial completedSteps ─────────────────────────────────
  //
  // Validates: Requirement 3.7 (persist & resume from first incomplete step)

  describe('renders the correct step on resume from partial completedSteps', () => {
    it('starts at Step 1 (Selamat Datang, Admin!) when no steps are completed', () => {
      render(<AdminSetupWizard state={makeState([])} onComplete={noop} />)
      expect(
        screen.getByRole('heading', { name: 'Selamat Datang, Admin!' }),
      ).toBeInTheDocument()
    })

    it('starts at Step 2 (Tambah Rumpun Keluarga) when admin-welcome is completed', () => {
      render(<AdminSetupWizard state={makeState(['admin-welcome'])} onComplete={noop} />)
      expect(screen.getByRole('heading', { name: 'Tambah Rumpun Keluarga' })).toBeInTheDocument()
    })

    it('starts at Step 3 (Tambah Jenis Hewan) when first two steps are completed', () => {
      render(
        <AdminSetupWizard
          state={makeState(['admin-welcome', 'admin-clans'])}
          onComplete={noop}
        />,
      )
      expect(screen.getByRole('heading', { name: 'Tambah Jenis Hewan' })).toBeInTheDocument()
    })

    it('starts at Step 4 (Tambah Grup Acara) when first three steps are completed', () => {
      render(
        <AdminSetupWizard
          state={makeState(['admin-welcome', 'admin-clans', 'admin-animal-types'])}
          onComplete={noop}
        />,
      )
      expect(screen.getByRole('heading', { name: 'Tambah Grup Acara' })).toBeInTheDocument()
    })

    it('starts at Step 5 (Konfirmasi Akun Sesepuh) when first four steps are completed', () => {
      render(
        <AdminSetupWizard
          state={makeState(['admin-welcome', 'admin-clans', 'admin-animal-types', 'admin-groups'])}
          onComplete={noop}
        />,
      )
      expect(
        screen.getByRole('heading', { name: 'Konfirmasi Akun Sesepuh' }),
      ).toBeInTheDocument()
    })

    it('starts at Step 6 (Pengaturan Selesai!) when all but last step are completed', () => {
      render(
        <AdminSetupWizard
          state={makeState([
            'admin-welcome',
            'admin-clans',
            'admin-animal-types',
            'admin-groups',
            'admin-elders',
          ])}
          onComplete={noop}
        />,
      )
      expect(screen.getByRole('heading', { name: 'Pengaturan Selesai!' })).toBeInTheDocument()
    })

    it('renders Step 1 when state prop is null (fresh start)', () => {
      render(<AdminSetupWizard state={null} onComplete={noop} />)
      expect(
        screen.getByRole('heading', { name: 'Selamat Datang, Admin!' }),
      ).toBeInTheDocument()
    })
  })

  // ── 2. "Lanjut" blocked during IDB write ──────────────────────────────────

  describe('"Lanjut" is disabled while a step write is in flight', () => {
    it('disables the Lanjut button while completeStep is pending on step 1', async () => {
      let resolve!: () => void
      mockCompleteStep.mockReturnValue(new Promise<void>((r) => { resolve = r }))

      render(<AdminSetupWizard state={makeState([])} onComplete={noop} />)

      const btn = screen.getByRole('button', { name: /lanjut/i })
      fireEvent.click(btn)

      await waitFor(() => expect(btn).toBeDisabled())

      resolve()
    })
  })
})

// ─── Step 2: AdminStep2Clans ──────────────────────────────────────────────────

describe('AdminStep2Clans — "Lanjut" gate (Requirement 3.3)', () => {
  beforeEach(() => {
    clansStore.length = 0
    vi.clearAllMocks()
  })

  it('shows an error message when "Lanjut" is clicked with no clans saved', async () => {
    render(<AdminStep2Clans onNext={noop} />)

    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

    expect(
      await screen.findByText('Tambahkan minimal satu rumpun keluarga untuk melanjutkan.'),
    ).toBeInTheDocument()
  })

  it('does NOT call onNext when "Lanjut" is clicked with no clans saved', () => {
    const onNext = vi.fn()
    render(<AdminStep2Clans onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

    expect(onNext).not.toHaveBeenCalled()
  })

  it('calls onNext after saving a clan and clicking "Lanjut"', async () => {
    const onNext = vi.fn()
    render(<AdminStep2Clans onNext={onNext} />)

    // Fill in name and save
    fireEvent.change(screen.getByLabelText(/nama rumpun/i), {
      target: { value: 'Tongkonan Buntu' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    // Wait for the saved clan to appear in the list
    await screen.findByText('Tongkonan Buntu')

    // Now "Lanjut" should proceed
    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows save confirmation (saved clan appears in list) after clicking "Simpan"', async () => {
    render(<AdminStep2Clans onNext={noop} />)

    fireEvent.change(screen.getByLabelText(/nama rumpun/i), {
      target: { value: 'Tongkonan Rante' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    expect(await screen.findByText('Tongkonan Rante')).toBeInTheDocument()
    expect(screen.getByText(/rumpun tersimpan \(1\)/i)).toBeInTheDocument()
  })

  it('shows "Simpan" button as disabled when name field is empty', () => {
    render(<AdminStep2Clans onNext={noop} />)

    const saveBtn = screen.getByRole('button', { name: /^simpan$/i })
    expect(saveBtn).toBeDisabled()
  })

  it('enables "Simpan" when a name is typed', () => {
    render(<AdminStep2Clans onNext={noop} />)

    fireEvent.change(screen.getByLabelText(/nama rumpun/i), {
      target: { value: 'Tongkonan A' },
    })

    expect(screen.getByRole('button', { name: /^simpan$/i })).not.toBeDisabled()
  })
})

// ─── Step 3: AdminStep3AnimalTypes ────────────────────────────────────────────

describe('AdminStep3AnimalTypes — "Lanjut" gate (Requirement 3.4)', () => {
  beforeEach(() => {
    animalTypesStore.length = 0
    vi.clearAllMocks()
  })

  it('shows an error message when "Lanjut" is clicked with no animal types saved', async () => {
    render(<AdminStep3AnimalTypes onNext={noop} />)

    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

    expect(
      await screen.findByText('Tambahkan minimal satu jenis hewan untuk melanjutkan.'),
    ).toBeInTheDocument()
  })

  it('does NOT call onNext when "Lanjut" is clicked with no animal types saved', () => {
    const onNext = vi.fn()
    render(<AdminStep3AnimalTypes onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

    expect(onNext).not.toHaveBeenCalled()
  })

  it('calls onNext after saving an animal type and clicking "Lanjut"', async () => {
    const onNext = vi.fn()
    render(<AdminStep3AnimalTypes onNext={onNext} />)

    fireEvent.change(screen.getByLabelText(/^nama/i), {
      target: { value: 'Kerbau Bonga' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    // Wait for saved item to appear
    await screen.findByText('Kerbau Bonga')

    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows save confirmation (saved animal type in list) after "Simpan"', async () => {
    render(<AdminStep3AnimalTypes onNext={noop} />)

    fireEvent.change(screen.getByLabelText(/^nama/i), {
      target: { value: 'Babi Kecil' },
    })
    // Select babi category
    fireEvent.click(screen.getByRole('button', { name: /babi/i }))
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    expect(await screen.findByText('Babi Kecil')).toBeInTheDocument()
    expect(screen.getByText(/jenis hewan tersimpan \(1\)/i)).toBeInTheDocument()
  })

  it('shows "Simpan" button as disabled when name field is empty', () => {
    render(<AdminStep3AnimalTypes onNext={noop} />)

    expect(screen.getByRole('button', { name: /^simpan$/i })).toBeDisabled()
  })
})

// ─── Step 4: AdminStep4Groups ─────────────────────────────────────────────────

describe('AdminStep4Groups — "Lanjut" gate (Requirement 3.5)', () => {
  beforeEach(() => {
    groupsStore.length = 0
    vi.clearAllMocks()
  })

  it('shows an error message when "Lanjut" is clicked with no groups saved', async () => {
    render(<AdminStep4Groups onNext={noop} />)

    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

    expect(
      await screen.findByText('Tambahkan minimal satu grup acara untuk melanjutkan.'),
    ).toBeInTheDocument()
  })

  it('does NOT call onNext when "Lanjut" is clicked with no groups saved', () => {
    const onNext = vi.fn()
    render(<AdminStep4Groups onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))

    expect(onNext).not.toHaveBeenCalled()
  })

  it('calls onNext after saving a group and clicking "Lanjut"', async () => {
    const onNext = vi.fn()
    render(<AdminStep4Groups onNext={onNext} />)

    fireEvent.change(screen.getByLabelText(/nama grup/i), {
      target: { value: 'Rambu Solo 2025' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    await screen.findByText('Rambu Solo 2025')

    fireEvent.click(screen.getByRole('button', { name: /lanjut/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows save confirmation (saved group in list) after "Simpan"', async () => {
    render(<AdminStep4Groups onNext={noop} />)

    fireEvent.change(screen.getByLabelText(/nama grup/i), {
      target: { value: 'Upacara Adat 2025' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }))

    expect(await screen.findByText('Upacara Adat 2025')).toBeInTheDocument()
    expect(screen.getByText(/grup tersimpan \(1\)/i)).toBeInTheDocument()
  })

  it('shows "Simpan" button as disabled when name field is empty', () => {
    render(<AdminStep4Groups onNext={noop} />)

    expect(screen.getByRole('button', { name: /^simpan$/i })).toBeDisabled()
  })
})
