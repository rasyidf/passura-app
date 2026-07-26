import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { MoneyInput } from '@/kiosk/shared/MoneyInput'
import { AnimalTypePicker } from '@/kiosk/shared/AnimalTypePicker'
import { QuantityInput } from '@/kiosk/shared/QuantityInput'
import { db } from '@/db/local-db'
import type { AnimalType } from '@/db/types'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'

interface HandoverStep6AmountProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Handover Kiosk Flow — Step 6: Enter amount or select animal type + quantity.
 *
 * - When `assetType === "money"`: shows `MoneyInput` (min 1, max 999,999,999).
 * - When `assetType === "animal"`: shows `AnimalTypePicker` (buffalo/pig only)
 *   followed by `QuantityInput` (max 99).
 * - Stores `animalTypeName` for summary display (Property 10).
 *
 * Validates: Requirements 8.1, 9.1, 9.2, 9.4
 */
export function HandoverStep6Amount({ draft, onNext, onBack, isLoading }: HandoverStep6AmountProps) {
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])
  const [loadingAnimals, setLoadingAnimals] = useState(draft.assetType === 'animal')
  const [moneyAmount, setMoneyAmount] = useState<number | null>(draft.moneyAmount)
  const [animalTypeId, setAnimalTypeId] = useState<string | null>(draft.animalTypeId)
  const [quantity, setQuantity] = useState<number | null>(draft.quantity)

  useEffect(() => {
    if (draft.assetType === 'animal') {
      db.animalTypes.toArray().then((all) => {
        setAnimalTypes(all)
        setLoadingAnimals(false)
      })
    }
  }, [draft.assetType])

  const isMoneyMode = draft.assetType === 'money'

  const canAdvance = isMoneyMode
    ? moneyAmount != null && moneyAmount >= 1
    : animalTypeId != null && quantity != null && quantity >= 1

  async function handleNext() {
    if (!canAdvance) return
    if (isMoneyMode) {
      await onNext({
        currentStep: 6,
        moneyAmount,
        animalTypeId: null,
        animalTypeName: null,
        quantity: null,
      })
    } else {
      const selectedAnimal = animalTypes.find((a) => a.id === animalTypeId)
      await onNext({
        currentStep: 6,
        animalTypeId,
        animalTypeName: selectedAnimal?.name ?? null,
        quantity,
        moneyAmount: null,
      })
    }
  }

  const title = isMoneyMode ? 'Masukkan Jumlah Uang' : 'Pilih Jenis Hewan dan Jumlah'

  if (loadingAnimals) {
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
      nextDisabled={!canAdvance}
      isLoading={isLoading}
    >
      {isMoneyMode ? (
        <MoneyInput value={moneyAmount} onChange={setMoneyAmount} />
      ) : (
        <div className="flex flex-col gap-6">
          <AnimalTypePicker
            animalTypes={animalTypes}
            selectedId={animalTypeId}
            onSelect={setAnimalTypeId}
            filterKiosk
          />
          {animalTypeId && (
            <div className="flex flex-col gap-2">
              <label className="text-lg font-medium">Jumlah</label>
              <QuantityInput value={quantity} onChange={setQuantity} />
            </div>
          )}
        </div>
      )}
    </StepCard>
  )
}
