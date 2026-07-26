/**
 * Unit tests for the Loan Kiosk Flow step components.
 *
 * Tests:
 *   - LoanStep3Borrower: same-clan error blocks "Lanjut" (Requirement 6.7)
 *   - LoanStep1Group: empty groups shows admin message, disables forward nav (Req 6.8)
 *   - LoanStep4Type: "Uang" / "Hewan" selection path (Req 6.5, 6.6)
 *   - LoanStep5Amount: "Uang" shows MoneyInput, hides AnimalTypePicker; "Hewan" shows
 *       AnimalTypePicker, hides MoneyInput (Req 6.5, 6.6)
 *   - LoanStep9Confirm: save failure shows KioskErrorBanner without losing draft (Req 6.2)
 *
 * Validates: Requirements 6.7, 6.8, 6.9
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Clan, Group, AnimalType } from '@/db/types'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top, so we use vi.hoisted() for the
// mock functions so they are available in the factory closures.

const {
  mockClansToArray,
  mockGroupsToArray,
  mockAnimalTypesToArrayFilter,
  mockLoansRepoCreate,
} = vi.hoisted(() => ({
  mockClansToArray: vi.fn<() => Promise<Clan[]>>(),
  mockGroupsToArray: vi.fn<() => Promise<Group[]>>(),
  mockAnimalTypesToArrayFilter: vi.fn<() => Promise<AnimalType[]>>(),
  mockLoansRepoCreate: vi.fn<() => Promise<void>>(),
}))

// ─── Mock @/db/local-db with an in-memory store ───────────────────────────────

vi.mock('@/db/local-db', () => ({
  db: {
    clans: {
      toArray: mockClansToArray,
    },
    groups: {
      toArray: mockGroupsToArray,
    },
    animalTypes: {
      filter: () => ({ toArray: mockAnimalTypesToArrayFilter }),
    },
  },
}))

// ─── Mock loansRepo for Step 9 save tests ─────────────────────────────────────

vi.mock('@/db/repositories', () => ({
  loansRepo: {
    create: mockLoansRepoCreate,
  },
}))

// Import components AFTER mocks are registered
import { LoanStep1Group } from '@/kiosk/steps/loan/LoanStep1Group'
import { LoanStep3Borrower } from '@/kiosk/steps/loan/LoanStep3Borrower'
import { LoanStep4Type } from '@/kiosk/steps/loan/LoanStep4Type'
import { LoanStep5Amount } from '@/kiosk/steps/loan/LoanStep5Amount'
import { LoanStep9Confirm } from '@/kiosk/steps/loan/LoanStep9Confirm'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeClan(id: string, name: string): Clan {
  return { id, name, syncStatus: 'synced', createdAt: 0, updatedAt: 0 }
}

function makeGroup(id: string, name: string): Group {
  return { id, name, syncStatus: 'synced', createdAt: 0, updatedAt: 0 }
}

const CLAN_A = makeClan('clan-aaa', 'Rante Bua')
const CLAN_B = makeClan('clan-bbb', 'Buntu Malenong')
const GROUP_1 = makeGroup('group-111', 'Rambu Solo 2024')

/** A minimal LoanKioskDraft used as base for step-specific tests */
function baseDraft(overrides: Partial<LoanKioskDraft> = {}): LoanKioskDraft {
  return {
    flowType: 'loan',
    currentStep: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    groupId: GROUP_1.id,
    groupName: GROUP_1.name,
    lenderClanId: null,
    lenderClanName: null,
    borrowerClanId: null,
    borrowerClanName: null,
    loanType: null,
    moneyAmount: null,
    animalTypeId: null,
    animalTypeName: null,
    quantity: null,
    dateIssued: '2024-01-15',
    witnessIds: [],
    ...overrides,
  }
}

/** A fully-populated draft so draftToLoan() won't throw (used in Step 9 tests). */
function completeDraft(): LoanKioskDraft {
  return baseDraft({
    lenderClanId: CLAN_A.id,
    lenderClanName: CLAN_A.name,
    borrowerClanId: CLAN_B.id,
    borrowerClanName: CLAN_B.name,
    loanType: 'money',
    moneyAmount: 500_000,
    dateIssued: '2024-06-01',
  })
}

// ─── LoanStep1Group ───────────────────────────────────────────────────────────
// Requirement 6.8: If no Groups exist, show admin message and prevent continuation.

describe('LoanStep1Group — Requirement 6.8', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the admin message when no groups exist in IndexedDB', async () => {
    mockGroupsToArray.mockResolvedValue([])

    render(
      <LoanStep1Group draft={baseDraft({ groupId: null })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText(/Belum ada grup acara/i)).toBeInTheDocument()
    })
  })

  it('does NOT render a "Lanjut" forward button when groups list is empty', async () => {
    mockGroupsToArray.mockResolvedValue([])

    render(
      <LoanStep1Group draft={baseDraft({ groupId: null })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByText(/Belum ada grup acara/i))

    // No "Lanjut" button should appear — StepCard rendered without onNext
    expect(screen.queryByRole('button', { name: /Lanjut/i })).not.toBeInTheDocument()
  })

  it('renders group options when groups exist', async () => {
    mockGroupsToArray.mockResolvedValue([GROUP_1])

    render(
      <LoanStep1Group draft={baseDraft({ groupId: null })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('Rambu Solo 2024')).toBeInTheDocument()
    })
  })

  it('"Lanjut" is disabled when no group is selected but groups exist', async () => {
    mockGroupsToArray.mockResolvedValue([GROUP_1])

    render(
      <LoanStep1Group draft={baseDraft({ groupId: null })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByText('Rambu Solo 2024'))

    expect(screen.getByRole('button', { name: /Lanjut/i })).toBeDisabled()
  })
})

// ─── LoanStep3Borrower ────────────────────────────────────────────────────────
// Requirement 6.7: If Lender and Borrower are the same clan, show validation
//   error and prevent navigation to Step 4.

describe('LoanStep3Borrower — Requirement 6.7', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockClansToArray.mockResolvedValue([CLAN_A, CLAN_B])
  })

  it('shows error banner when same clan is selected as both lender and borrower', async () => {
    // Draft has borrowerClanId pre-set equal to lenderClanId (stale draft scenario)
    const draft = baseDraft({
      lenderClanId: CLAN_A.id,
      lenderClanName: CLAN_A.name,
      borrowerClanId: CLAN_A.id,
    })
    const onNext = vi.fn()

    render(
      <LoanStep3Borrower draft={draft} onNext={onNext} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    // Click Lanjut to trigger validation
    fireEvent.click(screen.getByRole('button', { name: /Lanjut/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('alert').textContent).toMatch(
        /Pemberi dan peminjam tidak boleh sama/i
      )
    })
    expect(onNext).not.toHaveBeenCalled()
  })

  it('"Lanjut" button becomes disabled after same-clan validation error', async () => {
    const draft = baseDraft({
      lenderClanId: CLAN_A.id,
      borrowerClanId: CLAN_A.id,
    })

    render(
      <LoanStep3Borrower draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    fireEvent.click(screen.getByRole('button', { name: /Lanjut/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lanjut/i })).toBeDisabled()
    })
  })

  it('allows advancing when different clans are selected', async () => {
    const draft = baseDraft({
      lenderClanId: CLAN_A.id,
      lenderClanName: CLAN_A.name,
      borrowerClanId: CLAN_B.id,
      borrowerClanName: CLAN_B.name,
    })
    const onNext = vi.fn().mockResolvedValue(undefined)

    render(
      <LoanStep3Borrower draft={draft} onNext={onNext} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    const nextBtn = screen.getByRole('button', { name: /Lanjut/i })
    expect(nextBtn).not.toBeDisabled()
    fireEvent.click(nextBtn)

    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('clears the error banner when the user selects a different clan', async () => {
    // Start with the same-clan state to produce an error first
    const draft = baseDraft({
      lenderClanId: CLAN_A.id,
      lenderClanName: CLAN_A.name,
      borrowerClanId: CLAN_A.id,
    })

    render(
      <LoanStep3Borrower draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    // Trigger the error
    fireEvent.click(screen.getByRole('button', { name: /Lanjut/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    // Select CLAN_B (the non-lender option) — it appears in the list because
    // ClanPicker excludes lenderClanId (CLAN_A), so CLAN_B is visible
    const options = screen.getAllByRole('option')
    fireEvent.click(options[0]) // CLAN_B is the only option (CLAN_A excluded)

    // Error banner should disappear
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})

// ─── LoanStep4Type ────────────────────────────────────────────────────────────
// Requirement 6.5 / 6.6: Step 4 lets the elder pick "Uang" or "Hewan".

describe('LoanStep4Type — Requirement 6.5 / 6.6', () => {
  it('renders both "Uang" and "Hewan" options as listbox items', () => {
    render(
      <LoanStep4Type draft={baseDraft()} onNext={vi.fn()} onBack={vi.fn()} />
    )

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('Uang')).toBeInTheDocument()
    expect(screen.getByText('Hewan')).toBeInTheDocument()
  })

  it('"Lanjut" is disabled when no type is selected', () => {
    render(
      <LoanStep4Type draft={baseDraft({ loanType: null })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    expect(screen.getByRole('button', { name: /Lanjut/i })).toBeDisabled()
  })

  it('selecting "Uang" marks it aria-selected and enables "Lanjut"', () => {
    render(
      <LoanStep4Type draft={baseDraft({ loanType: null })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    const uangOption = screen.getByRole('option', { name: /Uang/i })
    fireEvent.click(uangOption)

    expect(uangOption).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: /Lanjut/i })).not.toBeDisabled()
  })

  it('selecting "Hewan" marks it aria-selected and enables "Lanjut"', () => {
    render(
      <LoanStep4Type draft={baseDraft({ loanType: null })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    const hewanOption = screen.getByRole('option', { name: /Hewan/i })
    fireEvent.click(hewanOption)

    expect(hewanOption).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: /Lanjut/i })).not.toBeDisabled()
  })

  it('calls onNext with loanType "money" when "Uang" selected', async () => {
    const onNext = vi.fn().mockResolvedValue(undefined)

    render(
      <LoanStep4Type draft={baseDraft({ loanType: null })} onNext={onNext} onBack={vi.fn()} />
    )

    fireEvent.click(screen.getByRole('option', { name: /Uang/i }))
    fireEvent.click(screen.getByRole('button', { name: /Lanjut/i }))

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ loanType: 'money' }))
    })
  })

  it('calls onNext with loanType "animal" when "Hewan" selected', async () => {
    const onNext = vi.fn().mockResolvedValue(undefined)

    render(
      <LoanStep4Type draft={baseDraft({ loanType: null })} onNext={onNext} onBack={vi.fn()} />
    )

    fireEvent.click(screen.getByRole('option', { name: /Hewan/i }))
    fireEvent.click(screen.getByRole('button', { name: /Lanjut/i }))

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ loanType: 'animal' }))
    })
  })
})

// ─── LoanStep5Amount — "Uang" path hides AnimalTypePicker ────────────────────
// ─── LoanStep5Amount — "Hewan" path hides MoneyInput ─────────────────────────
// Requirement 6.5 / 6.6

describe('LoanStep5Amount — "Uang" path (Requirement 6.6)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows MoneyInput ("Rp" label / "Jumlah rupiah" aria-label) when loanType is "money"', async () => {
    render(
      <LoanStep5Amount draft={baseDraft({ loanType: 'money' })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Jumlah rupiah')).toBeInTheDocument()
    })
  })

  it('does NOT show AnimalTypePicker when loanType is "money"', async () => {
    render(
      <LoanStep5Amount draft={baseDraft({ loanType: 'money' })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByLabelText('Jumlah rupiah'))

    expect(
      screen.queryByRole('listbox', { name: /Pilih Jenis Hewan/i })
    ).not.toBeInTheDocument()
  })

  it('does NOT show QuantityInput ("Jumlah hewan") when loanType is "money"', async () => {
    render(
      <LoanStep5Amount draft={baseDraft({ loanType: 'money' })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByLabelText('Jumlah rupiah'))

    expect(screen.queryByLabelText('Jumlah hewan')).not.toBeInTheDocument()
  })
})

describe('LoanStep5Amount — "Hewan" path (Requirement 6.5)', () => {
  const mockAnimalType: AnimalType = {
    id: 'at-001',
    name: 'Kerbau Besar',
    category: 'buffalo',
    breed: 'Toraja',
    quality: 'high',
    price: 10_000_000,
    syncStatus: 'synced',
    createdAt: 0,
    updatedAt: 0,
  }

  beforeEach(() => {
    vi.resetAllMocks()
    mockAnimalTypesToArrayFilter.mockResolvedValue([mockAnimalType])
  })

  it('shows AnimalTypePicker when loanType is "animal"', async () => {
    render(
      <LoanStep5Amount draft={baseDraft({ loanType: 'animal' })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => {
      expect(
        screen.getByRole('listbox', { name: /Pilih Jenis Hewan/i })
      ).toBeInTheDocument()
    })
  })

  it('shows QuantityInput ("Jumlah hewan") when loanType is "animal"', async () => {
    render(
      <LoanStep5Amount draft={baseDraft({ loanType: 'animal' })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Jumlah hewan')).toBeInTheDocument()
    })
  })

  it('does NOT show MoneyInput when loanType is "animal"', async () => {
    render(
      <LoanStep5Amount draft={baseDraft({ loanType: 'animal' })} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox', { name: /Pilih Jenis Hewan/i }))

    expect(screen.queryByLabelText('Jumlah rupiah')).not.toBeInTheDocument()
  })
})

// ─── LoanStep9Confirm ─────────────────────────────────────────────────────────
// Requirement 6.2: On save failure, show KioskErrorBanner; data must NOT be lost.

describe('LoanStep9Confirm — save failure shows error banner (Requirement 6.2)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows KioskErrorBanner when loansRepo.create() rejects', async () => {
    mockLoansRepoCreate.mockRejectedValue(new Error('Quota exceeded'))

    render(
      <LoanStep9Confirm draft={completeDraft()} onNext={vi.fn()} onBack={vi.fn()} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('error banner shows fallback Indonesian message when rejection is not an Error instance', async () => {
    // Rejecting with a non-Error value (e.g. a plain string) triggers the
    // fallback message: "Gagal menyimpan. Data belum hilang. Coba lagi?"
    mockLoansRepoCreate.mockRejectedValue('network failure')

    render(
      <LoanStep9Confirm draft={completeDraft()} onNext={vi.fn()} onBack={vi.fn()} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Gagal menyimpan/i)
    })
  })

  it('does NOT call onNext when save fails — draft is preserved', async () => {
    mockLoansRepoCreate.mockRejectedValue(new Error('disk full'))
    const onNext = vi.fn()

    render(
      <LoanStep9Confirm draft={completeDraft()} onNext={onNext} onBack={vi.fn()} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi/i }))

    await waitFor(() => screen.getByRole('alert'))

    expect(onNext).not.toHaveBeenCalled()
  })

  it('confirm button remains visible after save failure to allow retry', async () => {
    mockLoansRepoCreate.mockRejectedValue(new Error('disk full'))

    render(
      <LoanStep9Confirm draft={completeDraft()} onNext={vi.fn()} onBack={vi.fn()} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi/i }))

    await waitFor(() => screen.getByRole('alert'))

    expect(screen.getByRole('button', { name: /Konfirmasi/i })).toBeInTheDocument()
  })

  it('calls onNext after a successful save', async () => {
    mockLoansRepoCreate.mockResolvedValue(undefined)
    const onNext = vi.fn().mockResolvedValue(undefined)

    render(
      <LoanStep9Confirm draft={completeDraft()} onNext={onNext} onBack={vi.fn()} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi/i }))

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledOnce()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
