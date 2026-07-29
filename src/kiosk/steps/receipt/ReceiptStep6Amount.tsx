import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { MoneyInput } from '@/kiosk/shared/MoneyInput'
import { AnimalTypePicker } from '@/kiosk/shared/AnimalTypePicker'
import { QuantityInput } from '@/kiosk/shared/QuantityInput'
import { db } from '@/db/local-db'
import type { AnimalType } from '@/db/types'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'

interface ReceiptStep6AmountProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Receipt Kiosk Flow — Step 6: Enter Amount or Select Animal Type + Quantity.
 *
 * Shows MoneyInput when assetType is "money" (Requirement 7.7).
 * Shows AnimalTypePicker + QuantityInput when assetType is "animal".
 * Stores animal type name in draft for summary display (Requirement 7.5).
 *
 * Validates: Requirements 7.1, 7.7, 9.1, 9.2, 9.4, 9.5
 */
export function ReceiptStep6Amount({ draft, onNext, onBack, isLoading }: ReceiptStep6AmountProps) {
  const [moneyAmount, setMoneyAmount] = useState<number | null>(draft.moneyAmount)
  const [animalTypeId, setAnimalTypeId] = useState<string | null>(draft.animalTypeId)
  const [quantity, setQuantity] = useState<number | null>(draft.quantity)
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])
  const [loadingAnimalTypes, setLoadingAnimalTypes] = useState(draft.assetType === 'animal')

  useEffect(() => {
    if (draft.assetType === 'animal') {
      db.animalTypes.toArray().then((all) => {
        setAnimalTypes(all)
        setLoadingAnimalTypes(false)
      })
    }
  }, [draft.assetType])

  const isMoney = draft.assetType === 'money'
  const isAnimal = draft.assetType === 'animal'

  const isNextDisabled = isMoney
    ? !moneyAmount
    : isAnimal
      ? !animalTypeId || !quantity
      : true

  async function handleNext() {
    if (isNextDisabled) return
    if (isMoney) {
      await onNext({
        currentStep: 6,
        moneyAmount,
        animalTypeId: null,
        animalTypeName: null,
        animalTypePrice: null,
        quantity: null,
      })
    } else {
      const selected = animalTypes.find((a) => a.id === animalTypeId)
      await onNext({
        currentStep: 6,
        moneyAmount: null,
        animalTypeId,
        animalTypeName: selected?.name ?? null,
        animalTypePrice: selected?.price ?? null,
        quantity,
      })
    }
  }

  const title = isMoney ? 'Jumlah Uang' : 'Jenis Hewan & Jumlah'

  if (isAnimal && loadingAnimalTypes) {
    return (
      <StepCard
        stepIndex={5}
        totalSteps={10}
        title={title}
        isLoading={true}
      >
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={5}
      totalSteps={10}
      title={title}
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={isNextDisabled}
      isLoading={isLoading}
    >
      {isMoney && (
        <MoneyInput
          value={moneyAmount}
          onChange={setMoneyAmount}
          disabled={isLoading}
        />
      )}

      {isAnimal && (
        <div className="flex flex-col gap-6">
          <AnimalTypePicker
            animalTypes={animalTypes}
            selectedId={animalTypeId}
            onSelect={setAnimalTypeId}
            filterKiosk
          />
          <div className="flex items-center gap-4">
            <span className="text-lg font-medium">Jumlah:</span>
            <QuantityInput
              value={quantity}
              onChange={setQuantity}
              disabled={isLoading}
            />
          </div>
        </div>
      )}
    </StepCard>
  )
}
