import { useState } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { loansRepo } from '@/db/repositories'
import { draftToLoan } from '@/kiosk/KioskDraft'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep9ConfirmProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Loan Kiosk Flow — Step 9: Confirm & save.
 *
 * On "Konfirmasi" press:
 *   1. Calls `draftToLoan(draft)` to produce the entity payload.
 *   2. Calls `loansRepo.create(...)` which writes to IndexedDB with
 *      `syncStatus: "local"` and creates a `syncLog` entry with
 *      `syncStatus: "pending"` (Requirement 6.2, 10.1).
 *   3. On success: calls `onNext` to transition to the success screen.
 *   4. On failure: shows `KioskErrorBanner` — data is NOT lost (Req 6.2).
 *
 * Validates: Requirements 6.1, 6.2, 9.2, 9.3, 9.4, 10.1
 */
export function LoanStep9Confirm({ draft, onNext, onBack, isLoading }: LoanStep9ConfirmProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleConfirm() {
    setSaveError(null)
    setIsSaving(true)
    try {
      const loanPayload = draftToLoan(draft)
      await loansRepo.create(loanPayload)
      // Transition to the success state — currentStep 9 signals completion to the flow
      await onNext({ currentStep: 9 })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan. Data belum hilang. Coba lagi?'
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <StepCard
      stepIndex={8}
      totalSteps={9}
      title="Konfirmasi Pinjaman"
      onNext={handleConfirm}
      onBack={onBack}
      nextLabel="Konfirmasi"
      isLoading={isSaving || isLoading}
    >
      <div className="space-y-6">
        <p className="text-lg">
          Apakah semua informasi sudah benar? Tekan{' '}
          <strong>Konfirmasi</strong> untuk menyimpan catatan pinjaman ini.
        </p>

        {saveError && (
          <KioskErrorBanner message={saveError} />
        )}

        <p className="text-base text-muted-foreground">
          Data akan disimpan secara lokal dan disinkronkan saat perangkat
          terhubung ke internet.
        </p>
      </div>
    </StepCard>
  )
}
