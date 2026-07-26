import { StepCard } from '@/kiosk/shared/StepCard'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'

interface HandoverStep5AssetTypeProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

type AssetType = 'money' | 'animal'

const ASSET_OPTIONS: { value: AssetType; label: string; description: string }[] = [
  { value: 'money', label: 'Uang', description: 'Penyerahan dalam bentuk uang tunai (Rupiah)' },
  { value: 'animal', label: 'Hewan', description: 'Penyerahan dalam bentuk hewan ternak' },
]

/**
 * Handover Kiosk Flow — Step 5: Select Asset Type (Uang / Hewan).
 *
 * Selecting an option immediately advances to the next step.
 * When switching asset type, clears previously entered amount/animal data.
 *
 * Validates: Requirements 8.1, 9.2, 9.4, 9.5
 */
export function HandoverStep5AssetType({ draft, onNext, onBack, isLoading }: HandoverStep5AssetTypeProps) {
  const selected = draft.assetType

  async function handleSelect(value: AssetType) {
    // Clear stale asset fields when switching type
    await onNext({
      currentStep: 5,
      assetType: value,
      moneyAmount: null,
      animalTypeId: null,
      animalTypeName: null,
      quantity: null,
    })
  }

  return (
    <StepCard
      stepIndex={4}
      totalSteps={10}
      title="Pilih Jenis Aset"
      onBack={onBack}
      nextDisabled={!selected}
      onNext={selected ? () => handleSelect(selected) : undefined}
      isLoading={isLoading}
    >
      <div
        role="listbox"
        aria-label="Pilih jenis aset penyerahan"
        className="flex flex-col gap-2"
      >
        {ASSET_OPTIONS.map(({ value, label, description }) => {
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
