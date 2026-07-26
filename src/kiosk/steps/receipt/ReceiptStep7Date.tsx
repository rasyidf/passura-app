import { useState } from 'react'
import { format } from 'date-fns'
import { StepCard } from '@/kiosk/shared/StepCard'
import { DatePicker } from '@/kiosk/shared/DatePicker'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'

interface ReceiptStep7DateProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Receipt Kiosk Flow — Step 7: Select Date Received.
 *
 * Defaults to today when no date is set in the draft.
 *
 * Validates: Requirements 7.1, 9.2, 9.4
 */
export function ReceiptStep7Date({ draft, onNext, onBack, isLoading }: ReceiptStep7DateProps) {
  // Default to today if not set
  const [dateReceived, setDateReceived] = useState<string>(
    draft.dateReceived ?? format(new Date(), 'yyyy-MM-dd')
  )

  async function handleNext() {
    await onNext({
      currentStep: 7,
      dateReceived,
    })
  }

  return (
    <StepCard
      stepIndex={6}
      totalSteps={10}
      title="Tanggal Penerimaan"
      onNext={handleNext}
      onBack={onBack}
      isLoading={isLoading}
    >
      <DatePicker
        value={dateReceived}
        onChange={setDateReceived}
        disabled={isLoading}
      />
    </StepCard>
  )
}
