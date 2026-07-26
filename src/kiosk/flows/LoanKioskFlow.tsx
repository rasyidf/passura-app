import { useState } from 'react'
import { useKiosk } from '@/kiosk/KioskContext'
import { useKioskDraft } from '@/kiosk/useKioskDraft'
import { LOAN_DRAFT_KEY } from '@/kiosk/KioskDraft'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'
import { LoanStep1Group } from '@/kiosk/steps/loan/LoanStep1Group'
import { LoanStep2Lender } from '@/kiosk/steps/loan/LoanStep2Lender'
import { LoanStep3Borrower } from '@/kiosk/steps/loan/LoanStep3Borrower'
import { LoanStep4Type } from '@/kiosk/steps/loan/LoanStep4Type'
import { LoanStep5Amount } from '@/kiosk/steps/loan/LoanStep5Amount'
import { LoanStep6Date } from '@/kiosk/steps/loan/LoanStep6Date'
import { LoanStep7Witnesses } from '@/kiosk/steps/loan/LoanStep7Witnesses'
import { LoanStep8Summary } from '@/kiosk/steps/loan/LoanStep8Summary'
import { LoanStep9Confirm } from '@/kiosk/steps/loan/LoanStep9Confirm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoanKioskFlowProps {
  /** Called when the user taps "Kembali ke Dasbor" from the success card. */
  onExit: () => void
  /** Called after a loan is saved and the flow reaches the success card.
   *  Not used internally — provided for parent composition if needed. */
  onComplete: () => void
}

// ─── Initial draft factory ────────────────────────────────────────────────────

/** Returns a blank `LoanKioskDraft` for starting a new flow. */
function createInitialDraft(): LoanKioskDraft {
  const now = Date.now()
  return {
    flowType: 'loan',
    currentStep: 0,
    createdAt: now,
    updatedAt: now,
    groupId: null,
    groupName: null,
    lenderClanId: null,
    lenderClanName: null,
    borrowerClanId: null,
    borrowerClanName: null,
    loanType: null,
    moneyAmount: null,
    animalTypeId: null,
    animalTypeName: null,
    quantity: null,
    dateIssued: null,
    witnessIds: [],
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Loan Kiosk Flow — orchestrates Steps 1–9 for recording a new loan.
 *
 * - Derives the active step from `draft.currentStep`.
 * - Passes an `onNext` callback to each step; `onNext(patch)` merges `patch`
 *   into the draft (including advancing `currentStep`) and persists to
 *   IndexedDB before the component re-renders.
 * - Shows a success card when `draft.currentStep >= 9` (after Step 9 confirms).
 * - A persistent "Keluar Kios" button is visible on every step with a
 *   confirmation dialog (Requirement 5.4).
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 5.4
 */
export function LoanKioskFlow({ onExit, onComplete }: LoanKioskFlowProps) {
  const kiosk = useKiosk()
  const { draft, updateDraft, clearDraft, isLoading } =
    useKioskDraft<LoanKioskDraft>(LOAN_DRAFT_KEY)

  // Confirmation dialog state for "Keluar Kios" (Requirement 5.4)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // ── Effective draft (fall back to blank when no persisted draft) ───────────
  const effectiveDraft: LoanKioskDraft = draft ?? createInitialDraft()
  const currentStep = effectiveDraft.currentStep

  // ── onNext callback passed to every step component ─────────────────────────
  async function handleNext(patch: Partial<LoanKioskDraft>): Promise<void> {
    await updateDraft({ ...patch, updatedAt: Date.now() })
  }

  // ── Back navigation — decrements currentStep without clearing data ─────────
  async function handleBack(): Promise<void> {
    if (currentStep <= 0) return
    await updateDraft({ currentStep: currentStep - 1, updatedAt: Date.now() })
  }

  // ── "Catat Lagi": clear draft and reinitialise to step 0 ──────────────────
  async function handleCatatLagi(): Promise<void> {
    await clearDraft()
    await updateDraft(createInitialDraft())
  }

  // ── "Kembali ke Dasbor" on success card ───────────────────────────────────
  function handleKembaliDasbor(): void {
    kiosk.exit()
    onExit()
  }

  // ── "Keluar Kios" confirmed ────────────────────────────────────────────────
  function handleExitConfirmed(): void {
    setShowExitConfirm(false)
    kiosk.exit()
    onExit()
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6">
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </div>
    )
  }

  // ── Success card (shown after Step 9 saves successfully) ──────────────────
  if (currentStep >= 9) {
    return (
      <div className="flex flex-col min-h-screen bg-background p-6 md:p-10">
        {/* Success heading */}
        <h1 className="kiosk-h1 mb-4 text-green-700">Pinjaman Berhasil Dicatat!</h1>
        <p className="text-lg mb-8 text-muted-foreground">
          Catatan pinjaman telah disimpan dan akan disinkronkan saat perangkat
          terhubung ke internet.
        </p>

        {/* Loan summary (human-readable, no raw UUIDs — Requirement 6.4) */}
        <div className="rounded-lg border border-border bg-card p-6 mb-8 space-y-3 text-lg">
          {effectiveDraft.groupName && (
            <p>
              <span className="font-semibold">Grup Acara:</span>{' '}
              {effectiveDraft.groupName}
            </p>
          )}
          {effectiveDraft.lenderClanName && (
            <p>
              <span className="font-semibold">Pemberi Pinjaman:</span>{' '}
              {effectiveDraft.lenderClanName}
            </p>
          )}
          {effectiveDraft.borrowerClanName && (
            <p>
              <span className="font-semibold">Peminjam:</span>{' '}
              {effectiveDraft.borrowerClanName}
            </p>
          )}
          {effectiveDraft.loanType && (
            <p>
              <span className="font-semibold">Jenis Pinjaman:</span>{' '}
              {effectiveDraft.loanType === 'money' ? 'Uang' : 'Hewan'}
            </p>
          )}
          {effectiveDraft.loanType === 'money' && effectiveDraft.moneyAmount != null && (
            <p>
              <span className="font-semibold">Jumlah:</span>{' '}
              Rp {effectiveDraft.moneyAmount.toLocaleString('id-ID')}
            </p>
          )}
          {effectiveDraft.loanType === 'animal' && effectiveDraft.animalTypeName && (
            <p>
              <span className="font-semibold">Hewan:</span>{' '}
              {effectiveDraft.animalTypeName}
              {effectiveDraft.quantity != null
                ? ` × ${effectiveDraft.quantity}`
                : ''}
            </p>
          )}
          {effectiveDraft.dateIssued && (
            <p>
              <span className="font-semibold">Tanggal:</span>{' '}
              {effectiveDraft.dateIssued}
            </p>
          )}
        </div>

        {/* Two success-card actions — Requirement 6.3 */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={handleCatatLagi}
            className="kiosk-btn rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            Catat Lagi
          </button>
          <button
            type="button"
            onClick={handleKembaliDasbor}
            className="kiosk-btn rounded-md bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[filter]"
          >
            Kembali ke Dasbor
          </button>
        </div>
      </div>
    )
  }

  // ── Active step renderer ───────────────────────────────────────────────────

  // All step components declare `onBack: () => void` as a required prop.
  // Step 0 passes handleBack too — the StepCard itself suppresses the back
  // button when it would navigate to step -1 (there is no prior step on step 0,
  // so the LoanStep1Group component simply doesn't render a back navigation).
  const stepProps = {
    draft: effectiveDraft,
    onNext: handleNext,
    onBack: handleBack,
    isLoading,
  }

  function renderStep() {
    switch (currentStep) {
      case 0:
        return <LoanStep1Group {...stepProps} />
      case 1:
        return <LoanStep2Lender {...stepProps} />
      case 2:
        return <LoanStep3Borrower {...stepProps} />
      case 3:
        return <LoanStep4Type {...stepProps} />
      case 4:
        return <LoanStep5Amount {...stepProps} />
      case 5:
        return <LoanStep6Date {...stepProps} />
      case 6:
        return <LoanStep7Witnesses {...stepProps} />
      case 7:
        return <LoanStep8Summary {...stepProps} />
      case 8:
        return <LoanStep9Confirm {...stepProps} />
      default:
        // Fallback — should not be reached
        return <LoanStep1Group {...stepProps} />
    }
  }

  // ── Layout: step content + persistent "Keluar Kios" button ────────────────
  return (
    <>
      {/* Step content */}
      {renderStep()}

      {/* Persistent "Keluar Kios" button — Requirement 5.4 */}
      <div className="fixed bottom-6 right-6 z-10">
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="kiosk-btn rounded-md border border-destructive text-destructive bg-background hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive transition-colors shadow-md"
          aria-label="Keluar Kios"
        >
          Keluar Kios
        </button>
      </div>

      {/* Exit confirmation dialog — Requirement 5.4 */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background rounded-xl shadow-xl p-8 mx-6 max-w-sm w-full space-y-6">
            <h2
              id="exit-dialog-title"
              className="kiosk-h1"
            >
              Keluar dari Kios?
            </h2>
            <p className="text-lg text-muted-foreground">
              Entri yang sedang dibuat akan dibuang. Yakin ingin keluar?
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="kiosk-btn flex-1 rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExitConfirmed}
                className="kiosk-btn flex-1 rounded-md bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[filter]"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
