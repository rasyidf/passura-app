import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { MoneyInput } from '@/kiosk/shared/MoneyInput'
import { AnimalTypePicker } from '@/kiosk/shared/AnimalTypePicker'
import { QuantityInput } from '@/kiosk/shared/QuantityInput'
import { db } from '@/db/local-db'
import type { AnimalType } from '@/db/types'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep5AmountProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Loan Kiosk Flow — Step 5: Enter amount or select animal type + quantity.
 *
 * - When `loanType === "money"`: shows MoneyInput (min 1, max 999,999,999) — Req 6.6.
 * - When `loanType === "animal"`: shows AnimalTypePicker (kiosk-filtered) + QuantityInput
 *   (max 99) — Req 6.5.
 * Stores the animal type name in the draft for use in the summary (Requirement 6.4).
 *
 * Validates: Requirements 6.1, 6.5, 6.6, 9.2, 9.4, 9.5
 */
export function LoanStep5Amount({ draft, onNext, onBack, isLoading }: LoanStep5AmountProps) {
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])
  const [loadingAnimalTypes, setLoadingAnimalTypes] = useState(draft.loanType === 'animal')

  const [moneyAmount, setMoneyAmount] = useState<number | null>(draft.moneyAmount)
  const [animalTypeId, setAnimalTypeId] = useState<string | null>(draft.animalTypeId)
  const [quantity, setQuantity] = useState<number | null>(draft.quantity)

  useEffect(() => {
    if (draft.loanType === 'animal') {
      db.animalTypes
        .filter((at) => at.category === 'buffalo' || at.category === 'pig')
        .toArray()
        .then((all) => {
          setAnimalTypes(all)
          setLoadingAnimalTypes(false)
        })
    }
  }, [draft.loanType])

  const isMoneyValid = draft.loanType === 'money' && moneyAmount !== null && moneyAmount >= 1
  const isAnimalValid =
    draft.loanType === 'animal' && animalTypeId !== null && quantity !== null && quantity >= 1
  const canAdvance = draft.loanType === 'money' ? isMoneyValid : isAnimalValid

  async function handleNext() {
    if (!canAdvance) return

    if (draft.loanType === 'money') {
      await onNext({ currentStep: 5, moneyAmount, animalTypeId: null, quantity: null, animalTypeName: null, animalTypePrice: null })
    } else {
      const selected = animalTypes.find((at) => at.id === animalTypeId)
      await onNext({
        currentStep: 5,
        animalTypeId,
        animalTypeName: selected?.name ?? null,
        animalTypePrice: selected?.price ?? null,
        quantity,
        moneyAmount: null,
      })
    }
  }

  const title = draft.loanType === 'money' ? 'Jumlah Pinjaman (Uang)' : 'Pilih Jenis Hewan & Jumlah'

  if (loadingAnimalTypes) {
    return (
      <StepCard stepIndex={4} totalSteps={9} title={title} isLoading={true}>
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={4}
      totalSteps={9}
      title={title}
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!canAdvance}
      isLoading={isLoading}
    >
      {draft.loanType === 'money' ? (
        <div className="space-y-3">
          <p className="text-lg text-muted-foreground">
            Masukkan jumlah pinjaman dalam Rupiah.
          </p>
          <MoneyInput value={moneyAmount} onChange={setMoneyAmount} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-lg font-medium">Jenis Hewan</p>
            <AnimalTypePicker
              animalTypes={animalTypes}
              selectedId={animalTypeId}
              onSelect={setAnimalTypeId}
              filterKiosk={true}
            />
          </div>
          <div className="space-y-3">
            <p className="text-lg font-medium">Jumlah (maks. 99)</p>
            <QuantityInput value={quantity} onChange={setQuantity} />
          </div>
        </div>
      )}
    </StepCard>
  )
}
