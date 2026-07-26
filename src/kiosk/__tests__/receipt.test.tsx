/**
 * Unit tests for the Receipt Kiosk Flow step components and success card.
 *
 * Tests:
 *   - ReceiptStep3Giver: same-clan error blocks "Lanjut" and shows correct
 *       Indonesian message (Requirement 7.4)
 *   - ReceiptStep6Amount: MoneyInput is rendered with min=1 / max=999999999
 *       when assetType is "money" (Requirement 7.7)
 *   - ReceiptKioskFlow success card: renders exactly "Catat Lagi" and
 *       "Kembali ke Dasbor" action buttons when currentStep >= 10 (Req 7.3)
 *
 * Validates: Requirements 7.4, 7.7
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Clan } from '@/db/types'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const { mockClansToArray, mockAnimalTypesToArray } = vi.hoisted(() => ({
  mockClansToArray: vi.fn<() => Promise<Clan[]>>(),
  mockAnimalTypesToArray: vi.fn<() => Promise<import('@/db/types').AnimalType[]>>(),
}))

// ─── Mock @/db/local-db ───────────────────────────────────────────────────────

vi.mock('@/db/local-db', () => ({
  db: {
    clans: {
      toArray: mockClansToArray,
    },
    animalTypes: {
      toArray: mockAnimalTypesToArray,
      filter: () => ({ toArray: mockAnimalTypesToArray }),
    },
  },
}))

// ─── Mock @/db/repositories ───────────────────────────────────────────────────
// receiptsRepo.create must resolve cleanly for ReceiptStep10Confirm (used
// inside ReceiptKioskFlow) even though none of these tests call confirm.

vi.mock('@/db/repositories', () => ({
  receiptsRepo: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}))

// ─── Mock DatePicker and its calendar dependency ──────────────────────────────
// react-day-picker is not installed in the test environment; mock the
// DatePicker shared component so ReceiptStep7Date (and the full ReceiptKioskFlow
// import chain) resolves without the missing dependency.

vi.mock('@/kiosk/shared/DatePicker', () => ({
  DatePicker: ({
    value,
    onChange,
  }: {
    value: string | null
    onChange: (v: string) => void
  }) => (
    <input
      data-testid="date-picker"
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

// ─── Mock @/kiosk/useKioskDraft for ReceiptKioskFlow tests ───────────────────
// ReceiptKioskFlow uses useKioskDraft internally; we inject a controlled draft
// so we can drive the component to the success state (currentStep >= 10).

const mockUpdateDraft = vi.fn().mockResolvedValue(undefined)
const mockClearDraft = vi.fn().mockResolvedValue(undefined)
let mockDraft: ReceiptKioskDraft | null = null

vi.mock('@/kiosk/useKioskDraft', () => ({
  useKioskDraft: () => ({
    draft: mockDraft,
    updateDraft: mockUpdateDraft,
    clearDraft: mockClearDraft,
    isLoading: false,
  }),
}))

// ─── Import components AFTER mocks are registered ────────────────────────────

import { ReceiptStep3Giver } from '@/kiosk/steps/receipt/ReceiptStep3Giver'
import { ReceiptStep6Amount } from '@/kiosk/steps/receipt/ReceiptStep6Amount'
import { MoneyInput } from '@/kiosk/shared/MoneyInput'
import { ReceiptKioskFlow } from '@/kiosk/flows/ReceiptKioskFlow'
import { KioskProvider } from '@/kiosk/KioskContext'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeClan(id: string, name: string): Clan {
  return { id, name, syncStatus: 'synced', createdAt: 0, updatedAt: 0 }
}

const CLAN_A = makeClan('clan-aaa', 'Rante Bua')
const CLAN_B = makeClan('clan-bbb', 'Buntu Malenong')

/** Base ReceiptKioskDraft with sensible defaults for step-level testing. */
function baseReceiptDraft(overrides: Partial<ReceiptKioskDraft> = {}): ReceiptKioskDraft {
  return {
    flowType: 'receipt',
    currentStep: 2, // Step 3 (0-based)
    createdAt: Date.now(),
    updatedAt: Date.now(),
    groupId: 'group-001',
    groupName: 'Rambu Solo 2024',
    receiverClanId: null,
    receiverClanName: null,
    giverClanId: null,
    giverClanName: null,
    obligationType: null,
    assetType: null,
    moneyAmount: null,
    animalTypeId: null,
    animalTypeName: null,
    quantity: null,
    dateReceived: '2024-06-01',
    witnessIds: [],
    ...overrides,
  }
}

/** A draft at the success state (currentStep >= 10). */
function successDraft(): ReceiptKioskDraft {
  return baseReceiptDraft({
    currentStep: 10,
    receiverClanId: CLAN_A.id,
    receiverClanName: CLAN_A.name,
    giverClanId: CLAN_B.id,
    giverClanName: CLAN_B.name,
    obligationType: 'ritual',
    assetType: 'money',
    moneyAmount: 1_500_000,
    dateReceived: '2024-06-01',
  })
}

// ─── ReceiptStep3Giver — Requirement 7.4 ──────────────────────────────────────
// When receiverClanId and the selected giverClanId are the same, the step must
// display the error message "Penerima dan pemberi tidak boleh sama." in a
// KioskErrorBanner (role="alert") and disable the "Lanjut" button.

describe('ReceiptStep3Giver — same-clan validation (Requirement 7.4)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockClansToArray.mockResolvedValue([CLAN_A, CLAN_B])
  })

  it('shows the correct Indonesian error banner when receiver and giver are the same clan', async () => {
    const draft = baseReceiptDraft({
      receiverClanId: CLAN_A.id,
      receiverClanName: CLAN_A.name,
      giverClanId: CLAN_A.id, // same as receiver — should trigger error
    })

    render(
      <ReceiptStep3Giver draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toMatch(
      /Penerima dan pemberi tidak boleh sama/i
    )
  })

  it('"Lanjut" is disabled when receiver and giver clan are the same', async () => {
    const draft = baseReceiptDraft({
      receiverClanId: CLAN_A.id,
      giverClanId: CLAN_A.id,
    })

    render(
      <ReceiptStep3Giver draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    expect(screen.getByRole('button', { name: /Lanjut/i })).toBeDisabled()
  })

  it('onNext is NOT called when same-clan selection prevents navigation', async () => {
    const onNext = vi.fn()
    const draft = baseReceiptDraft({
      receiverClanId: CLAN_A.id,
      giverClanId: CLAN_A.id,
    })

    render(
      <ReceiptStep3Giver draft={draft} onNext={onNext} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    // Button is disabled — clicking should not call onNext
    fireEvent.click(screen.getByRole('button', { name: /Lanjut/i }))

    expect(onNext).not.toHaveBeenCalled()
  })

  it('no error banner when different clans are selected', async () => {
    const draft = baseReceiptDraft({
      receiverClanId: CLAN_A.id,
      giverClanId: CLAN_B.id, // different clan — no error
    })

    render(
      <ReceiptStep3Giver draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('"Lanjut" is enabled and callable when different clans are selected', async () => {
    const draft = baseReceiptDraft({
      receiverClanId: CLAN_A.id,
      giverClanId: CLAN_B.id,
    })
    const onNext = vi.fn().mockResolvedValue(undefined)

    render(
      <ReceiptStep3Giver draft={draft} onNext={onNext} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    const nextBtn = screen.getByRole('button', { name: /Lanjut/i })
    expect(nextBtn).not.toBeDisabled()
    fireEvent.click(nextBtn)

    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
  })

  it('error banner clears after user selects a different clan', async () => {
    // Start with same-clan state so the error is visible
    const draft = baseReceiptDraft({
      receiverClanId: CLAN_A.id,
      receiverClanName: CLAN_A.name,
      giverClanId: CLAN_A.id,
    })

    render(
      <ReceiptStep3Giver draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByRole('listbox'))

    // Error banner visible due to same-clan state
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // ClanPicker excludes CLAN_A (the receiver), so only CLAN_B is shown
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(0)
    fireEvent.click(options[0]) // select CLAN_B

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})

// ─── ReceiptStep6Amount — Requirement 7.7 ────────────────────────────────────
// When assetType is "money", the step must render MoneyInput with min=1 /
// max=999,999,999. We verify MoneyInput renders correctly and that the input
// enforces the [1, 999999999] range.

describe('ReceiptStep6Amount — MoneyInput min/max enforcement (Requirement 7.7)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAnimalTypesToArray.mockResolvedValue([])
  })

  it('renders MoneyInput (aria-label "Jumlah rupiah") when assetType is "money"', async () => {
    const draft = baseReceiptDraft({ assetType: 'money' })

    render(
      <ReceiptStep6Amount draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Jumlah rupiah')).toBeInTheDocument()
    })
  })

  it('MoneyInput accepts the minimum valid value of 1', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={null} onChange={onChange} />)

    const input = screen.getByLabelText('Jumlah rupiah')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1' } })

    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('MoneyInput accepts the maximum valid value of 999999999', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={null} onChange={onChange} />)

    const input = screen.getByLabelText('Jumlah rupiah')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '999999999' } })

    expect(onChange).toHaveBeenCalledWith(999_999_999)
  })

  it('MoneyInput rejects values below min — 0 produces null', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={null} onChange={onChange} />)

    const input = screen.getByLabelText('Jumlah rupiah')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '0' } })

    // 0 < 1 → clamp returns null
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('MoneyInput rejects values above max — 1_000_000_000 produces null', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={null} onChange={onChange} />)

    const input = screen.getByLabelText('Jumlah rupiah')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1000000000' } })

    // 1_000_000_000 > 999_999_999 → clamp returns null
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('"Lanjut" is disabled when no money amount is entered', async () => {
    const draft = baseReceiptDraft({ assetType: 'money', moneyAmount: null })

    render(
      <ReceiptStep6Amount draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByLabelText('Jumlah rupiah'))

    expect(screen.getByRole('button', { name: /Lanjut/i })).toBeDisabled()
  })

  it('"Lanjut" is enabled when a valid amount is pre-populated in the draft', async () => {
    const draft = baseReceiptDraft({ assetType: 'money', moneyAmount: 500_000 })

    render(
      <ReceiptStep6Amount draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    await waitFor(() => screen.getByLabelText('Jumlah rupiah'))

    expect(screen.getByRole('button', { name: /Lanjut/i })).not.toBeDisabled()
  })

  it('does NOT render MoneyInput when assetType is "animal"', async () => {
    const draft = baseReceiptDraft({ assetType: 'animal' })

    render(
      <ReceiptStep6Amount draft={draft} onNext={vi.fn()} onBack={vi.fn()} />
    )

    // Wait for loading phase to complete
    await waitFor(() =>
      expect(screen.queryByText(/Memuat/i)).not.toBeInTheDocument()
    )

    expect(screen.queryByLabelText('Jumlah rupiah')).not.toBeInTheDocument()
  })
})

// ─── ReceiptKioskFlow — success card (Requirement 7.3) ────────────────────────
// When draft.currentStep >= 10, the flow renders a success card containing
// EXACTLY two action buttons: "Catat Lagi" and "Kembali ke Dasbor".

describe('ReceiptKioskFlow — success card action buttons (Requirement 7.3)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockDraft = successDraft()
  })

  function renderFlow(onExit = vi.fn()) {
    return render(
      <KioskProvider>
        <ReceiptKioskFlow onExit={onExit} onComplete={vi.fn()} />
      </KioskProvider>
    )
  }

  it('renders the "Catat Lagi" button on the success card', () => {
    renderFlow()
    expect(screen.getByRole('button', { name: 'Catat Lagi' })).toBeInTheDocument()
  })

  it('renders the "Kembali ke Dasbor" button on the success card', () => {
    renderFlow()
    expect(screen.getByRole('button', { name: 'Kembali ke Dasbor' })).toBeInTheDocument()
  })

  it('success card has exactly two action buttons', () => {
    renderFlow()
    const buttons = screen.getAllByRole('button')
    const labels = buttons.map((b) => b.textContent?.trim())
    expect(labels).toContain('Catat Lagi')
    expect(labels).toContain('Kembali ke Dasbor')
    // Exactly 2 buttons on the success card (no "Keluar Kios" here)
    expect(buttons).toHaveLength(2)
  })

  it('"Catat Lagi" calls clearDraft and resets the flow to step 0', async () => {
    renderFlow()

    fireEvent.click(screen.getByRole('button', { name: 'Catat Lagi' }))

    await waitFor(() => {
      expect(mockClearDraft).toHaveBeenCalledOnce()
    })
    // updateDraft reinitialises with a blank draft at step 0
    expect(mockUpdateDraft).toHaveBeenCalledWith(
      expect.objectContaining({ flowType: 'receipt', currentStep: 0 })
    )
  })

  it('"Kembali ke Dasbor" calls onExit', () => {
    const onExit = vi.fn()
    renderFlow(onExit)

    fireEvent.click(screen.getByRole('button', { name: 'Kembali ke Dasbor' }))

    expect(onExit).toHaveBeenCalledOnce()
  })
})
