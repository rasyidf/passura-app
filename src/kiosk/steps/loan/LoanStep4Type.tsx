import { useState } from 'react'
import { cn } from '@/lib/utils'
import { StepCard } from '@/kiosk/shared/StepCard'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep4TypeProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Loan Kiosk Flow — Step 4: Select loan type (Uang / Hewan).
 *
 * Displays two `.kiosk-card` buttons — no raw <select> element (Requirement 9.5).
 *
 * Validates: Requirements 6.1, 6.5, 6.6, 9.2, 9.3, 9.4, 9.5
 */
export function LoanStep4Type({ draft, onNext, onBack, isLoading }: LoanStep4TypeProps) {
  const [selectedType, setSelectedType] = useState<'money' | 'animal' | null>(
    draft.loanType
  )

  async function handleNext() {
    if (!selectedType) return
    await onNext({ currentStep: 4, loanType: selectedType })
  }

  return (
    <StepCard
      stepIndex={3}
      totalSteps={9}
      title="Pilih Jenis Pinjaman"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selectedType}
      isLoading={isLoading}
    >
      <div
        role="listbox"
        aria-label="Pilih jenis pinjaman"
        className="flex flex-col gap-4"
      >
        {/* Uang (Money) */}
        <div
          role="option"
          aria-selected={selectedType === 'money'}
          tabIndex={0}
          onClick={() => setSelectedType('money')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedType('money')
            }
          }}
          className={cn(
            'kiosk-card',
            'flex flex-col justify-center cursor-pointer rounded-lg border outline-none',
            'transition-colors',
            'focus:ring-2 focus:ring-primary focus:outline-none',
            'text-lg',
            selectedType === 'money'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <span className="font-semibold text-xl">Uang</span>
          <span
            className={cn(
              'text-sm mt-0.5',
              selectedType === 'money' ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}
          >
            Pinjaman dalam bentuk uang tunai
          </span>
        </div>

        {/* Hewan (Animal) */}
        <div
          role="option"
          aria-selected={selectedType === 'animal'}
          tabIndex={0}
          onClick={() => setSelectedType('animal')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setSelectedType('animal')
            }
          }}
          className={cn(
            'kiosk-card',
            'flex flex-col justify-center cursor-pointer rounded-lg border outline-none',
            'transition-colors',
            'focus:ring-2 focus:ring-primary focus:outline-none',
            'text-lg',
            selectedType === 'animal'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <span className="font-semibold text-xl">Hewan</span>
          <span
            className={cn(
              'text-sm mt-0.5',
              selectedType === 'animal' ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}
          >
            Pinjaman dalam bentuk hewan (kerbau atau babi)
          </span>
        </div>
      </div>
    </StepCard>
  )
}
