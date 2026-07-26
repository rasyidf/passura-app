import { useState } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { cn } from '@/lib/utils'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'
import type { Receipt } from '@/db/types'

interface ReceiptStep4ObligationTypeProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

type ObligationType = Receipt['obligationType']

const OBLIGATION_OPTIONS: { value: ObligationType; label: string }[] = [
  { value: 'ritual', label: 'Ritual' },
  { value: 'social', label: 'Sosial' },
  { value: 'wedding', label: 'Pernikahan' },
  { value: 'funeral', label: 'Pemakaman' },
  { value: 'other', label: 'Lainnya' },
]

/**
 * Receipt Kiosk Flow — Step 4: Select Obligation Type.
 *
 * Displays five kiosk-card options: Ritual, Sosial, Pernikahan, Pemakaman, Lainnya.
 * Maps UI labels to Receipt entity `obligationType` values.
 *
 * Validates: Requirements 7.1, 9.2, 9.4, 9.5
 */
export function ReceiptStep4ObligationType({
  draft,
  onNext,
  onBack,
  isLoading,
}: ReceiptStep4ObligationTypeProps) {
  const [selected, setSelected] = useState<ObligationType | null>(draft.obligationType)

  async function handleNext() {
    if (!selected) return
    await onNext({
      currentStep: 4,
      obligationType: selected,
    })
  }

  return (
    <StepCard
      stepIndex={3}
      totalSteps={10}
      title="Jenis Kewajiban"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selected}
      isLoading={isLoading}
    >
      <div
        role="listbox"
        aria-label="Pilih Jenis Kewajiban"
        className="flex flex-col gap-2"
      >
        {OBLIGATION_OPTIONS.map(({ value, label }) => {
          const isSelected = selected === value
          return (
            <div
              key={value}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => setSelected(value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelected(value)
                }
              }}
              className={cn(
                'kiosk-card',
                'flex items-center cursor-pointer rounded-lg border outline-none',
                'transition-colors',
                'focus:ring-2 focus:ring-primary focus:outline-none',
                'text-lg font-semibold',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {label}
            </div>
          )
        })}
      </div>
    </StepCard>
  )
}
