/**
 * Unit tests for Handover Kiosk Flow steps.
 *
 * Validates: Requirements 8.4 (same-clan error), 8.7 (retry preserves draft)
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoist mocks so vi.mock factory can reference them ───────────────────────
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

// ─── Mock @/db/local-db ───────────────────────────────────────────────────────
// HandoverStep3ToClan reads db.clans.toArray() at mount time
vi.mock('@/db/local-db', () => ({
  db: {
    clans: {
      toArray: vi.fn().mockResolvedValue([
        { id: 'clan-a', name: 'Clan Alpha', syncStatus: 'local', createdAt: 0, updatedAt: 0 },
        { id: 'clan-b', name: 'Clan Beta',  syncStatus: 'local', createdAt: 0, updatedAt: 0 },
      ]),
    },
  },
}))

// ─── Mock @/db/repositories ──────────────────────────────────────────────────
vi.mock('@/db/repositories', () => ({
  handoversRepo: { create: mockCreate },
}))

import { HandoverStep3ToClan } from '@/kiosk/steps/handover/HandoverStep3ToClan'
import { HandoverStep10Confirm } from '@/kiosk/steps/handover/HandoverStep10Confirm'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'

// ─── Shared draft builder ─────────────────────────────────────────────────────
function makeDraft(overrides: Partial<HandoverKioskDraft> = {}): HandoverKioskDraft {
  return {
    flowType: 'handover',
    currentStep: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    groupId: 'group-1',
    groupName: 'Rambu Solo',
    fromClanId: 'clan-a',
    fromClanName: 'Clan Alpha',
    toClanId: null,
    toClanName: null,
    obligationType: 'ritual',
    assetType: 'money',
    moneyAmount: 500_000,
    animalTypeId: null,
    animalTypeName: null,
    quantity: null,
    date: '2024-03-15',
    witnessIds: [],
    ...overrides,
  }
}

// ─── Task 13.3a — Same-clan error (Requirement 8.4) ──────────────────────────
describe('HandoverStep3ToClan — same-clan validation (Req 8.4)', () => {
  it('shows "Clan asal dan tujuan tidak boleh sama." when toClan equals fromClan', async () => {
    const draft = makeDraft({ fromClanId: 'clan-a', toClanId: 'clan-a' })
    render(
      <HandoverStep3ToClan
        draft={draft}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    )

    // Wait for clan list to load (useEffect resolves async)
    await waitFor(() => expect(screen.queryByText('Memuat…')).not.toBeInTheDocument())

    // The error message should be visible once selectedId === fromClanId
    // In initial render toClanId = 'clan-a' === fromClanId → error fires immediately
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Clan asal dan tujuan tidak boleh sama.')).toBeInTheDocument()
  })

  it('blocks the "Lanjut" button when same-clan error is present', async () => {
    const draft = makeDraft({ fromClanId: 'clan-a', toClanId: 'clan-a' })
    render(
      <HandoverStep3ToClan
        draft={draft}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.queryByText('Memuat…')).not.toBeInTheDocument())

    const nextButton = screen.getByText('Lanjut')
    expect(nextButton).toBeDisabled()
  })

  it('clears the error and enables "Lanjut" when a different clan is selected via ClanPicker', async () => {
    // Start with no toClan selection (no conflict), pick clan-b (different from fromClan clan-a)
    const draft = makeDraft({ fromClanId: 'clan-a', toClanId: null })
    const onNext = vi.fn().mockResolvedValue(undefined)
    render(
      <HandoverStep3ToClan
        draft={draft}
        onNext={onNext}
        onBack={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.queryByText('Memuat…')).not.toBeInTheDocument())

    // No error should appear initially (no selection)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // Select Clan Beta (clan-b ≠ clan-a → no error, button should enable)
    fireEvent.click(screen.getByText('Clan Beta'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Lanjut')).not.toBeDisabled()
  })
})

// ─── Task 13.3b — Retry preserves draft on confirm failure (Requirement 8.7) ─
describe('HandoverStep10Confirm — retry on save failure (Req 8.7)', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  const confirmDraft = makeDraft({
    currentStep: 9,
    fromClanId: 'clan-a',
    toClanId: 'clan-b',
    toClanName: 'Clan Beta',
  })

  it('shows KioskErrorBanner when handoversRepo.create() rejects', async () => {
    mockCreate.mockRejectedValue(new Error('Network error'))

    render(
      <HandoverStep10Confirm
        draft={confirmDraft}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    )

    // Click "Konfirmasi & Simpan" (the nextLabel on StepCard)
    fireEvent.click(screen.getByText('Konfirmasi & Simpan'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Error message should contain the failure copy
    expect(screen.getByRole('alert').textContent).toContain('Gagal menyimpan')
  })

  it('shows a "Coba Lagi" retry button after save failure', async () => {
    mockCreate.mockRejectedValue(new Error('Timeout'))

    render(
      <HandoverStep10Confirm
        draft={confirmDraft}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Konfirmasi & Simpan'))

    await waitFor(() => expect(screen.getByText('Coba Lagi')).toBeInTheDocument())
  })

  it('does NOT call onNext when save fails', async () => {
    mockCreate.mockRejectedValue(new Error('DB error'))
    const onNext = vi.fn()

    render(
      <HandoverStep10Confirm
        draft={confirmDraft}
        onNext={onNext}
        onBack={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Konfirmasi & Simpan'))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    // onNext must NOT have been called
    expect(onNext).not.toHaveBeenCalled()
  })

  it('draft data is preserved in UI after failure (summary rows still rendered)', async () => {
    mockCreate.mockRejectedValue(new Error('Disk full'))

    render(
      <HandoverStep10Confirm
        draft={confirmDraft}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Konfirmasi & Simpan'))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    // Draft-derived summary rows must still be visible — proving draft was not cleared
    expect(screen.getByText('Clan Alpha')).toBeInTheDocument() // fromClanName
    expect(screen.getByText('Clan Beta')).toBeInTheDocument()  // toClanName
  })

  it('retrying via "Coba Lagi" calls handoversRepo.create() again', async () => {
    // First call fails, second succeeds
    mockCreate
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue({ id: 'h-1' })

    const onNext = vi.fn().mockResolvedValue(undefined)

    render(
      <HandoverStep10Confirm
        draft={confirmDraft}
        onNext={onNext}
        onBack={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Konfirmasi & Simpan'))
    await waitFor(() => expect(screen.getByText('Coba Lagi')).toBeInTheDocument())

    // Retry
    fireEvent.click(screen.getByText('Coba Lagi'))

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1))
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })
})
