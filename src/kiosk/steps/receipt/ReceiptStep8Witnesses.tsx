import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { cn } from '@/lib/utils'
import { db } from '@/db/local-db'
import type { Elder } from '@/db/types'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'

interface ReceiptStep8WitnessesProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Receipt Kiosk Flow — Step 8: Select Witnesses (optional).
 *
 * Displays a multi-select list of elders as witnesses. This step is optional —
 * the elder may proceed without selecting any witnesses.
 *
 * Validates: Requirements 7.1, 9.2, 9.4, 9.5
 */
export function ReceiptStep8Witnesses({ draft, onNext, onBack, isLoading }: ReceiptStep8WitnessesProps) {
  const [elders, setElders] = useState<Elder[]>([])
  const [loadingElders, setLoadingElders] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>(draft.witnessIds ?? [])

  useEffect(() => {
    db.elders.toArray().then((all) => {
      const validators = all.filter((e) => e.role === 'validator')
      setElders(validators)
      // Drop any persisted witness IDs that no longer exist as validators
      const validIds = new Set(validators.map((e) => e.id))
      setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
      setLoadingElders(false)
    })
  }, [])

  function toggleWitness(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((wid) => wid !== id) : [...prev, id]
    )
  }

  async function handleNext() {
    await onNext({
      currentStep: 8,
      witnessIds: selectedIds,
    })
  }

  if (loadingElders) {
    return (
      <StepCard
        stepIndex={7}
        totalSteps={10}
        title="Pilih Saksi (Opsional)"
        isLoading={true}
      >
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={7}
      totalSteps={10}
      title="Pilih Saksi (Opsional)"
      onNext={handleNext}
      onBack={onBack}
      nextLabel="Lanjut"
      isLoading={isLoading}
    >
      {elders.length === 0 ? (
        <p className="text-lg text-muted-foreground">
          Tidak ada saksi tersedia. Anda bisa melanjutkan tanpa saksi.
        </p>
      ) : (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label="Pilih Saksi"
          className="flex flex-col gap-2"
        >
          {elders.map((elder) => {
            const isSelected = selectedIds.includes(elder.id)
            return (
              <div
                key={elder.id}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => toggleWitness(elder.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleWitness(elder.id)
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
                <span className="font-semibold">{elder.name}</span>
                {isSelected && (
                  <span className="text-sm mt-0.5 text-primary-foreground/80">Dipilih</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </StepCard>
  )
}
