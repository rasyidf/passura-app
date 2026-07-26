import { StepCard } from '@/kiosk/shared/StepCard'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'
import type { Handover } from '@/db/types'

interface HandoverStep4ObligationTypeProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

type ObligationType = Handover['obligationType']

const OBLIGATION_OPTIONS: { value: ObligationType; label: string; description: string }[] = [
  { value: 'ritual', label: 'Ritual', description: 'Upacara adat atau keagamaan' },
  { value: 'social', label: 'Sosial', description: 'Kegiatan sosial kemasyarakatan' },
  { value: 'wedding', label: 'Pernikahan', description: 'Seserahan atau mahar pernikahan' },
  { value: 'funeral', label: 'Pemakaman', description: 'Keperluan upacara pemakaman' },
  { value: 'other', label: 'Lainnya', description: 'Jenis kewajiban lainnya' },
]

/**
 * Handover Kiosk Flow — Step 4: Select Obligation Type.
 *
 * Five `.kiosk-card` obligation type options rendered as an accessible listbox.
 *
 * Validates: Requirements 8.1, 9.2, 9.4, 9.5
 */
export function HandoverStep4ObligationType({ draft, onNext, onBack, isLoading }: HandoverStep4ObligationTypeProps) {
  const selected = draft.obligationType

  async function handleSelect(value: ObligationType) {
    await onNext({
      currentStep: 4,
      obligationType: value,
    })
  }

  return (
    <StepCard
      stepIndex={3}
      totalSteps={10}
      title="Pilih Jenis Kewajiban"
      onBack={onBack}
      // Next is triggered directly by selecting an option card
      nextDisabled={!selected}
      onNext={selected ? () => handleSelect(selected) : undefined}
      isLoading={isLoading}
    >
      <div
        role="listbox"
        aria-label="Pilih jenis kewajiban"
        className="flex flex-col gap-2"
      >
        {OBLIGATION_OPTIONS.map(({ value, label, description }) => {
          const isSelected = selected === value
          return (
            <div
              key={value}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => handleSelect(value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelect(value)
                }
              }}
              className={[
                'kiosk-card',
                'flex flex-col justify-center cursor-pointer rounded-lg border outline-none',
                'transition-colors',
                'focus:ring-2 focus:ring-primary focus:outline-none',
                'text-lg',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              <span className="font-semibold">{label}</span>
              <span
                className={[
                  'text-sm mt-0.5',
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                ].join(' ')}
              >
                {description}
              </span>
            </div>
          )
        })}
      </div>
    </StepCard>
  )
}
