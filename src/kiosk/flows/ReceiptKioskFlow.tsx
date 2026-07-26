import { useState } from 'react'
import { useKiosk } from '@/kiosk/KioskContext'
import { useKioskDraft } from '@/kiosk/useKioskDraft'
import { RECEIPT_DRAFT_KEY } from '@/kiosk/KioskDraft'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'
import { ReceiptStep1Group } from '@/kiosk/steps/receipt/ReceiptStep1Group'
import { ReceiptStep2Receiver } from '@/kiosk/steps/receipt/ReceiptStep2Receiver'
import { ReceiptStep3Giver } from '@/kiosk/steps/receipt/ReceiptStep3Giver'
import { ReceiptStep4ObligationType } from '@/kiosk/steps/receipt/ReceiptStep4ObligationType'
import { ReceiptStep5AssetType } from '@/kiosk/steps/receipt/ReceiptStep5AssetType'
import { ReceiptStep6Amount } from '@/kiosk/steps/receipt/ReceiptStep6Amount'
import { ReceiptStep7Date } from '@/kiosk/steps/receipt/ReceiptStep7Date'
import { ReceiptStep8Witnesses } from '@/kiosk/steps/receipt/ReceiptStep8Witnesses'
import { ReceiptStep9Summary } from '@/kiosk/steps/receipt/ReceiptStep9Summary'
import { ReceiptStep10Confirm } from '@/kiosk/steps/receipt/ReceiptStep10Confirm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReceiptKioskFlowProps {
  /** Called when the user taps "Kembali ke Dasbor" from the success card. */
  onExit: () => void
  /** Called after a receipt is saved and the flow reaches the success card. */
  onComplete: () => void
}

// ─── Initial draft factory ────────────────────────────────────────────────────

/** Returns a blank `ReceiptKioskDraft` for starting a new flow. */
function createInitialDraft(): ReceiptKioskDraft {
  const now = Date.now()
  return {
    flowType: 'receipt',
    currentStep: 0,
    createdAt: now,
    updatedAt: now,
    groupId: null,
    groupName: null,
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
    dateReceived: null,
    witnessIds: [],
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Receipt Kiosk Flow — orchestrates Steps 1–10 for recording a new receipt.
 *
 * - Derives the active step from `draft.currentStep`.
 * - Passes an `onNext` callback to each step; `onNext(patch)` merges `patch`
 *   into the draft (including advancing `currentStep`) and persists to
 *   IndexedDB before the component re-renders.
 * - Shows a success card when `draft.currentStep >= 10` (after Step 10 confirms).
 * - A persistent "Keluar Kios" button is visible on every step with a
 *   confirmation dialog (Requirement 5.4).
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 5.4
 */
export function ReceiptKioskFlow({ onExit, onComplete }: ReceiptKioskFlowProps) {
  const kiosk = useKiosk()
  const { draft, updateDraft, clearDraft, isLoading } =
    useKioskDraft<ReceiptKioskDraft>(RECEIPT_DRAFT_KEY)

  // Confirmation dialog state for "Keluar Kios" (Requirement 5.4)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // ── Effective draft (fall back to blank when no persisted draft) ───────────
  const effectiveDraft: ReceiptKioskDraft = draft ?? createInitialDraft()
  const currentStep = effectiveDraft.currentStep

  // ── onNext callback passed to every step component ─────────────────────────
  async function handleNext(patch: Partial<ReceiptKioskDraft>): Promise<void> {
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

  // ── Success card (shown after Step 10 saves successfully) ──────────────────
  if (currentStep >= 10) {
    return (
      <div className="flex flex-col min-h-screen bg-background p-6 md:p-10">
        {/* Success heading */}
        <h1 className="kiosk-h1 mb-4 text-green-700">Penerimaan Berhasil Dicatat!</h1>
        <p className="text-lg mb-8 text-muted-foreground">
          Catatan penerimaan telah disimpan dan akan disinkronkan saat perangkat
          terhubung ke internet.
        </p>

        {/* Receipt summary (human-readable, no raw UUIDs — Requirement 7.5) */}
        <div className="rounded-lg border border-border bg-card p-6 mb-8 space-y-3 text-lg">
          {effectiveDraft.groupName && (
            <p>
              <span className="font-semibold">Grup Acara:</span>{' '}
              {effectiveDraft.groupName}
            </p>
          )}
          {effectiveDraft.receiverClanName && (
            <p>
              <span className="font-semibold">Penerima:</span>{' '}
              {effectiveDraft.receiverClanName}
            </p>
          )}
          {effectiveDraft.giverClanName && (
            <p>
              <span className="font-semibold">Pemberi:</span>{' '}
              {effectiveDraft.giverClanName}
            </p>
          )}
          {effectiveDraft.obligationType && (
            <p>
              <span className="font-semibold">Jenis Kewajiban:</span>{' '}
              {effectiveDraft.obligationType === 'ritual' ? 'Ritual'
                : effectiveDraft.obligationType === 'social' ? 'Sosial'
                : effectiveDraft.obligationType === 'wedding' ? 'Pernikahan'
                : effectiveDraft.obligationType === 'funeral' ? 'Pemakaman'
                : 'Lainnya'}
            </p>
          )}
          {effectiveDraft.assetType === 'money' && effectiveDraft.moneyAmount != null && (
            <p>
              <span className="font-semibold">Jumlah:</span>{' '}
              Rp {effectiveDraft.moneyAmount.toLocaleString('id-ID')}
            </p>
          )}
          {effectiveDraft.assetType === 'animal' && effectiveDraft.animalTypeName && (
            <p>
              <span className="font-semibold">Hewan:</span>{' '}
              {effectiveDraft.animalTypeName}
              {effectiveDraft.quantity != null
                ? ` × ${effectiveDraft.quantity}`
                : ''}
            </p>
          )}
          {effectiveDraft.dateReceived && (
            <p>
              <span className="font-semibold">Tanggal:</span>{' '}
              {effectiveDraft.dateReceived}
            </p>
          )}
        </div>

        {/* Two success-card actions — Requirement 7.3 */}
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
  const stepProps = {
    draft: effectiveDraft,
    onNext: handleNext,
    onBack: handleBack,
    isLoading,
  }

  function renderStep() {
    switch (currentStep) {
      case 0:
        return <ReceiptStep1Group {...stepProps} />
      case 1:
        return <ReceiptStep2Receiver {...stepProps} />
      case 2:
        return <ReceiptStep3Giver {...stepProps} />
      case 3:
        return <ReceiptStep4ObligationType {...stepProps} />
      case 4:
        return <ReceiptStep5AssetType {...stepProps} />
      case 5:
        return <ReceiptStep6Amount {...stepProps} />
      case 6:
        return <ReceiptStep7Date {...stepProps} />
      case 7:
        return <ReceiptStep8Witnesses {...stepProps} />
      case 8:
        return <ReceiptStep9Summary {...stepProps} />
      case 9:
        return <ReceiptStep10Confirm {...stepProps} />
      default:
        return <ReceiptStep1Group {...stepProps} />
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
