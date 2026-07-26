import { useState } from 'react'
import { format } from 'date-fns'
import { StepCard } from '@/kiosk/shared/StepCard'
import { DatePicker } from '@/kiosk/shared/DatePicker'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep6DateProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Loan Kiosk Flow — Step 6: Select date issued.
 *
 * Defaults to today when the draft has no dateIssued set (Requirement 6.1).
 *
 * Validates: Requirements 6.1, 9.2, 9.4
 */
export function LoanStep6Date({ draft, onNext, onBack, isLoading }: LoanStep6DateProps) {
  // Default to today if no date is stored in the draft yet
  const [dateIssued, setDateIssued] = useState<string>(
    draft.dateIssued ?? format(new Date(), 'yyyy-MM-dd')
  )

  async function handleNext() {
    await onNext({ currentStep: 6, dateIssued })
  }

  return (
    <StepCard
      stepIndex={5}
      totalSteps={9}
      title="Tanggal Pinjaman"
      onNext={handleNext}
      onBack={onBack}
      isLoading={isLoading}
    >
      <div className="space-y-3">
        <p className="text-lg text-muted-foreground">
          Pilih tanggal pinjaman diberikan.
        </p>
        <DatePicker value={dateIssued} onChange={setDateIssued} />
      </div>
    </StepCard>
  )
}
