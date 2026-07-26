import { useState } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { receiptsRepo } from '@/db/repositories'
import { draftToReceipt } from '@/kiosk/KioskDraft'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'

interface ReceiptStep10ConfirmProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Receipt Kiosk Flow — Step 10: Confirm & Save.
 *
 * Calls `receiptsRepo.create(draftToReceipt(draft))` to persist the receipt to
 * IndexedDB with `settlementStatus: "pending"` and `syncStatus: "local/pending"`
 * (Requirements 7.2, 10.1).
 *
 * On save failure, displays an error via KioskErrorBanner without losing data
 * (design error handling pattern). The draft remains intact so the elder can retry.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 9.4
 */
export function ReceiptStep10Confirm({ draft, onNext, onBack, isLoading }: ReceiptStep10ConfirmProps) {
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleConfirm() {
    setSaveError(null)
    setIsSaving(true)
    try {
      const receipt = draftToReceipt(draft)
      await receiptsRepo.create(receipt)
      // Advance to success (step 10 = index 10, signals flow completion to parent)
      await onNext({ currentStep: 10 })
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
      stepIndex={9}
      totalSteps={10}
      title="Konfirmasi Penerimaan"
      onNext={handleConfirm}
      onBack={onBack}
      nextLabel="Konfirmasi"
      isLoading={isLoading || isSaving}
    >
      {saveError && (
        <KioskErrorBanner message={saveError} />
      )}

      <p className="text-lg text-foreground">
        Periksa kembali data Anda sebelum menyimpan. Setelah dikonfirmasi, data akan
        disimpan ke perangkat dan akan disinkronkan saat ada koneksi internet.
      </p>
    </StepCard>
  )
}
