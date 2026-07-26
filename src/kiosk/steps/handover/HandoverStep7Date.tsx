import { useState } from 'react'
import { format } from 'date-fns'
import { StepCard } from '@/kiosk/shared/StepCard'
import { DatePicker } from '@/kiosk/shared/DatePicker'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'

interface HandoverStep7DateProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Handover Kiosk Flow — Step 7: Select handover date.
 *
 * Defaults to today's date (ISO string) when the draft has no date set.
 *
 * Validates: Requirements 8.1, 9.2, 9.4
 */
export function HandoverStep7Date({ draft, onNext, onBack, isLoading }: HandoverStep7DateProps) {
  // Default to today if draft doesn't already have a date
  const [date, setDate] = useState<string>(
    draft.date ?? format(new Date(), 'yyyy-MM-dd')
  )

  async function handleNext() {
    await onNext({
      currentStep: 7,
      date,
    })
  }

  return (
    <StepCard
      stepIndex={6}
      totalSteps={10}
      title="Pilih Tanggal Penyerahan"
      onNext={handleNext}
      onBack={onBack}
      isLoading={isLoading}
    >
      <DatePicker value={date} onChange={setDate} />
    </StepCard>
  )
}
