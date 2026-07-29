import { useState, type ReactNode } from 'react'
import { useKiosk } from '@/kiosk/KioskContext'
import { useKioskDraft } from '@/kiosk/useKioskDraft'
import type { KioskDraftBase, KioskDraftKey } from '@/kiosk/KioskDraft'

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Maps an obligation type value to its Indonesian display label.
 * Used by Receipt and Handover success summary rows.
 */
export function obligationTypeLabel(
  type: 'ritual' | 'social' | 'wedding' | 'funeral' | 'other' | null | undefined
): string {
  switch (type) {
    case 'ritual':  return 'Ritual'
    case 'social':  return 'Sosial'
    case 'wedding': return 'Pernikahan'
    case 'funeral': return 'Pemakaman'
    default:        return 'Lainnya'
  }
}

/**
 * Renders the asset value rows (money amount or animal type × quantity)
 * for a kiosk flow success summary card.
 */
export function KioskAssetSummaryRows({
  assetType,
  moneyAmount,
  animalTypeName,
  quantity,
}: {
  assetType: 'money' | 'animal' | null
  moneyAmount: number | null
  animalTypeName: string | null
  quantity: number | null
}) {
  return (
    <>
      {assetType === 'money' && moneyAmount != null && (
        <p>
          <span className="font-semibold">Jumlah:</span>{' '}
          Rp {moneyAmount.toLocaleString('id-ID')}
        </p>
      )}
      {assetType === 'animal' && animalTypeName && (
        <p>
          <span className="font-semibold">Hewan:</span>{' '}
          {animalTypeName}{quantity != null ? ` × ${quantity}` : ''}
        </p>
      )}
    </>
  )
}

// ─── Handlers object passed to renderStep ────────────────────────────────────

interface KioskDraftHandlers<D extends KioskDraftBase> {
  draft: D
  onNext: (patch: Partial<D>) => Promise<void>
  onBack: () => Promise<void>
  isLoading: boolean
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface KioskFlowShellProps<D extends KioskDraftBase> {
  /** IndexedDB key used to persist the draft. */
  draftKey: KioskDraftKey
  /** Factory that returns a blank draft for step 0. */
  createInitialDraft: () => D
  /** Step index at which the success card is shown (e.g. 9 for Loan, 10 for Receipt/Handover). */
  successStep: number
  /** Title shown on the success card (e.g. "Pinjaman Berhasil Dicatat!"). */
  successTitle: string
  /** Subtitle message shown below the success title. */
  successSubtitle: string
  /**
   * The per-flow summary rows shown inside the success card's bordered box.
   * Receives the effective draft so the caller can render human-readable fields.
   */
  renderSuccessSummary: (draft: D) => ReactNode
  /**
   * Renders the active step component.
   * Receives a `KioskDraftHandlers<D>` object and must return a React element.
   */
  renderStep: (handlers: KioskDraftHandlers<D>) => ReactNode
  /** Called when the user confirms exit, or taps "Kembali ke Dasbor". */
  onExit: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Generic shell for all three Kiosk flows (Loan, Receipt, Handover).
 *
 * Owns all shared state and behaviour:
 * - Draft loading and persistence via `useKioskDraft`
 * - handleNext / handleBack / handleCatatLagi / handleKembaliDasbor
 * - Loading screen
 * - Success card (title + subtitle + summary rows + two action buttons)
 * - Persistent "Keluar Kios" fixed button
 * - Exit confirmation dialog
 *
 * Per-flow concerns (step rendering, success summary rows) are injected via
 * `renderStep` and `renderSuccessSummary` render-prop functions.
 *
 * Validates: Requirements 5.4, 6.3, 7.3, 8.3
 */
export function KioskFlowShell<D extends KioskDraftBase>({
  draftKey,
  createInitialDraft,
  successStep,
  successTitle,
  successSubtitle,
  renderSuccessSummary,
  renderStep,
  onExit,
}: KioskFlowShellProps<D>) {
  const kiosk = useKiosk()
  const { draft, updateDraft, clearDraft, isLoading } = useKioskDraft<D>(draftKey)

  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // ── Effective draft ────────────────────────────────────────────────────────
  const effectiveDraft: D = draft ?? createInitialDraft()
  const currentStep = effectiveDraft.currentStep

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleNext(patch: Partial<D>): Promise<void> {
    await updateDraft({ ...patch, updatedAt: Date.now() } as Partial<D>)
  }

  async function handleBack(): Promise<void> {
    if (currentStep <= 0) return
    await updateDraft({ currentStep: currentStep - 1, updatedAt: Date.now() } as Partial<D>)
  }

  async function handleCatatLagi(): Promise<void> {
    await clearDraft()
    await updateDraft(createInitialDraft())
  }

  function handleKembaliDasbor(): void {
    kiosk.exit()
    onExit()
  }

  function handleExitConfirmed(): void {
    setShowExitConfirm(false)
    kiosk.exit()
    onExit()
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6">
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </div>
    )
  }

  // ── Success card ───────────────────────────────────────────────────────────
  if (currentStep >= successStep) {
    return (
      <div className="flex flex-col min-h-screen bg-background p-6 md:p-10">
        <h1 className="kiosk-h1 mb-4 text-green-700">{successTitle}</h1>
        <p className="text-lg mb-8 text-muted-foreground">{successSubtitle}</p>

        <div className="rounded-lg border border-border bg-card p-6 mb-8 space-y-3 text-lg">
          {renderSuccessSummary(effectiveDraft)}
        </div>

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

  // ── Active step + persistent exit button ───────────────────────────────────
  return (
    <>
      {renderStep({ draft: effectiveDraft, onNext: handleNext, onBack: handleBack, isLoading })}

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
            <h2 id="exit-dialog-title" className="kiosk-h1">
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
