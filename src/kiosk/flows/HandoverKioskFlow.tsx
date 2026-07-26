import { useState } from 'react'
import { useKiosk } from '@/kiosk/KioskContext'
import { useKioskDraft } from '@/kiosk/useKioskDraft'
import { HANDOVER_DRAFT_KEY } from '@/kiosk/KioskDraft'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'
import { HandoverStep1Group } from '@/kiosk/steps/handover/HandoverStep1Group'
import { HandoverStep2FromClan } from '@/kiosk/steps/handover/HandoverStep2FromClan'
import { HandoverStep3ToClan } from '@/kiosk/steps/handover/HandoverStep3ToClan'
import { HandoverStep4ObligationType } from '@/kiosk/steps/handover/HandoverStep4ObligationType'
import { HandoverStep5AssetType } from '@/kiosk/steps/handover/HandoverStep5AssetType'
import { HandoverStep6Amount } from '@/kiosk/steps/handover/HandoverStep6Amount'
import { HandoverStep7Date } from '@/kiosk/steps/handover/HandoverStep7Date'
import { HandoverStep8Witnesses } from '@/kiosk/steps/handover/HandoverStep8Witnesses'
import { HandoverStep9Summary } from '@/kiosk/steps/handover/HandoverStep9Summary'
import { HandoverStep10Confirm } from '@/kiosk/steps/handover/HandoverStep10Confirm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HandoverKioskFlowProps {
  /** Called when the user taps "Kembali ke Dasbor" from the success card. */
  onExit: () => void
  /** Called after a handover is saved and the flow reaches the success card. */
  onComplete: () => void
}

// ─── Initial draft factory ────────────────────────────────────────────────────

/** Returns a blank `HandoverKioskDraft` for starting a new flow. */
function createInitialDraft(): HandoverKioskDraft {
  const now = Date.now()
  return {
    flowType: 'handover',
    currentStep: 0,
    createdAt: now,
    updatedAt: now,
    groupId: null,
    groupName: null,
    fromClanId: null,
    fromClanName: null,
    toClanId: null,
    toClanName: null,
    obligationType: null,
    assetType: null,
    moneyAmount: null,
    animalTypeId: null,
    animalTypeName: null,
    quantity: null,
    date: null,
    witnessIds: [],
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Handover Kiosk Flow — orchestrates Steps 1–10 for recording a new handover.
 *
 * - Derives the active step from `draft.currentStep`.
 * - Passes an `onNext` callback to each step; `onNext(patch)` merges `patch`
 *   into the draft (including advancing `currentStep`) and persists to
 *   IndexedDB before the component re-renders.
 * - Shows a success card when `draft.currentStep >= 10` (after Step 10 confirms).
 * - A persistent "Keluar Kios" button is visible on every step with a
 *   confirmation dialog (Requirement 5.4).
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 5.4
 */
export function HandoverKioskFlow({ onExit, onComplete }: HandoverKioskFlowProps) {
  const kiosk = useKiosk()
  const { draft, updateDraft, clearDraft, isLoading } =
    useKioskDraft<HandoverKioskDraft>(HANDOVER_DRAFT_KEY)

  // Confirmation dialog state for "Keluar Kios" (Requirement 5.4)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // ── Effective draft (fall back to blank when no persisted draft) ───────────
  const effectiveDraft: HandoverKioskDraft = draft ?? createInitialDraft()
  const currentStep = effectiveDraft.currentStep

  // ── onNext callback passed to every step component ─────────────────────────
  async function handleNext(patch: Partial<HandoverKioskDraft>): Promise<void> {
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
        <h1 className="kiosk-h1 mb-4 text-green-700">Penyerahan Berhasil Dicatat!</h1>
        <p className="text-lg mb-8 text-muted-foreground">
          Catatan penyerahan telah disimpan dan akan disinkronkan saat perangkat
          terhubung ke internet.
        </p>

        {/* Handover summary (human-readable, no raw UUIDs — Requirement 8.5) */}
        <div className="rounded-lg border border-border bg-card p-6 mb-8 space-y-3 text-lg">
          {effectiveDraft.groupName && (
            <p>
              <span className="font-semibold">Grup Acara:</span>{' '}
              {effectiveDraft.groupName}
            </p>
          )}
          {effectiveDraft.fromClanName && (
            <p>
              <span className="font-semibold">Clan Asal:</span>{' '}
              {effectiveDraft.fromClanName}
            </p>
          )}
          {effectiveDraft.toClanName && (
            <p>
              <span className="font-semibold">Clan Tujuan:</span>{' '}
              {effectiveDraft.toClanName}
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
          {effectiveDraft.date && (
            <p>
              <span className="font-semibold">Tanggal:</span>{' '}
              {effectiveDraft.date}
            </p>
          )}
        </div>

        {/* Two success-card actions — Requirement 8.3 */}
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
        return <HandoverStep1Group {...stepProps} />
      case 1:
        return <HandoverStep2FromClan {...stepProps} />
      case 2:
        return <HandoverStep3ToClan {...stepProps} />
      case 3:
        return <HandoverStep4ObligationType {...stepProps} />
      case 4:
        return <HandoverStep5AssetType {...stepProps} />
      case 5:
        return <HandoverStep6Amount {...stepProps} />
      case 6:
        return <HandoverStep7Date {...stepProps} />
      case 7:
        return <HandoverStep8Witnesses {...stepProps} />
      case 8:
        return <HandoverStep9Summary {...stepProps} />
      case 9:
        return <HandoverStep10Confirm {...stepProps} />
      default:
        return <HandoverStep1Group {...stepProps} />
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
