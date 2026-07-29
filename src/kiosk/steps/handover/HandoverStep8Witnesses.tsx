import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { db } from '@/db/local-db'
import type { Elder } from '@/db/types'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'

interface HandoverStep8WitnessesProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Handover Kiosk Flow — Step 8: Select witnesses (optional).
 *
 * Witnesses are optional — the elder can advance without selecting any.
 * Renders elders as selectable kiosk-card items; multiple can be selected.
 *
 * Validates: Requirements 8.1, 9.2, 9.4, 9.5
 */
export function HandoverStep8Witnesses({ draft, onNext, onBack, isLoading }: HandoverStep8WitnessesProps) {
  const [elders, setElders] = useState<Elder[]>([])
  const [loadingElders, setLoadingElders] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>(draft.witnessIds)

  useEffect(() => {
    db.elders.toArray().then((all) => {
      setElders(all)
      // Drop any persisted witness IDs that no longer exist in the elders table
      const validIds = new Set(all.map((e) => e.id))
      setSelectedIds((prev) => prev.filter((id) => validIds.has(id)))
      setLoadingElders(false)
    })
  }, [])

  function toggleElder(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
        <p className="text-lg text-muted-foreground">Belum ada saksi yang tersedia.</p>
      ) : (
        <div
          role="listbox"
          aria-label="Pilih saksi"
          aria-multiselectable="true"
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
                onClick={() => toggleElder(elder.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleElder(elder.id)
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
                <span className="font-semibold">{elder.name}</span>
                <span
                  className={[
                    'text-sm mt-0.5',
                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {elder.role}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {selectedIds.length > 0 && (
        <p className="text-lg text-muted-foreground mt-4">
          {selectedIds.length} saksi dipilih
        </p>
      )}
    </StepCard>
  )
}
