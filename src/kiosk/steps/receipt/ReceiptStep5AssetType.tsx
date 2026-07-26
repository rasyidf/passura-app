import { useState } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { cn } from '@/lib/utils'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'

interface ReceiptStep5AssetTypeProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

type AssetType = 'money' | 'animal'

const ASSET_OPTIONS: { value: AssetType; label: string; description: string }[] = [
  { value: 'money', label: 'Uang', description: 'Penerimaan berupa uang tunai (Rupiah)' },
  { value: 'animal', label: 'Hewan', description: 'Penerimaan berupa hewan ternak' },
]

/**
 * Receipt Kiosk Flow — Step 5: Select Asset Type.
 *
 * Displays two kiosk-card options: Uang and Hewan.
 *
 * Validates: Requirements 7.1, 9.2, 9.4, 9.5
 */
export function ReceiptStep5AssetType({
  draft,
  onNext,
  onBack,
  isLoading,
}: ReceiptStep5AssetTypeProps) {
  const [selected, setSelected] = useState<AssetType | null>(draft.assetType)

  async function handleNext() {
    if (!selected) return
    await onNext({
      currentStep: 5,
      assetType: selected,
    })
  }

  return (
    <StepCard
      stepIndex={4}
      totalSteps={10}
      title="Jenis Aset"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selected}
      isLoading={isLoading}
    >
      <div
        role="listbox"
        aria-label="Pilih Jenis Aset"
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
              onClick={() => setSelected(value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelected(value)
                }
              }}
              className={cn(
                'kiosk-card',
                'flex flex-col justify-center cursor-pointer rounded-lg border outline-none',
                'transition-colors',
                'focus:ring-2 focus:ring-primary focus:outline-none',
                'text-lg',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span className="font-semibold">{label}</span>
              <span
                className={cn(
                  'text-sm mt-0.5',
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}
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
