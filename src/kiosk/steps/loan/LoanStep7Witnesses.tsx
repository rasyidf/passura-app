import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { db } from '@/db/local-db'
import type { Elder } from '@/db/types'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep7WitnessesProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Loan Kiosk Flow — Step 7: Select witnesses (optional multi-select).
 *
 * Renders elders as checkbox items. Skip is allowed — the elder can proceed
 * without selecting any witnesses.
 *
 * Validates: Requirements 6.1, 9.2, 9.4
 */
export function LoanStep7Witnesses({ draft, onNext, onBack, isLoading }: LoanStep7WitnessesProps) {
  const [elders, setElders] = useState<Elder[]>([])
  const [loadingElders, setLoadingElders] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(draft.witnessIds ?? [])
  )

  useEffect(() => {
    db.elders.toArray().then((all) => {
      setElders(all)
      setLoadingElders(false)
    })
  }, [])

  function toggleWitness(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleNext() {
    await onNext({ currentStep: 7, witnessIds: [...selectedIds] })
  }

  if (loadingElders) {
    return (
      <StepCard
        stepIndex={6}
        totalSteps={9}
        title="Pilih Saksi (Opsional)"
        isLoading={true}
      >
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={6}
      totalSteps={9}
      title="Pilih Saksi (Opsional)"
      onNext={handleNext}
      onBack={onBack}
      // Always enabled — witnesses are optional (skip allowed)
      nextDisabled={false}
      isLoading={isLoading}
      nextLabel="Lanjut"
    >
      <div className="space-y-4">
        <p className="text-lg text-muted-foreground">
          Pilih satu atau lebih saksi. Langkah ini bersifat opsional — Anda bisa
          melanjutkan tanpa memilih saksi.
        </p>

        {elders.length === 0 ? (
          <p className="text-lg text-muted-foreground">
            Tidak ada data saksi yang tersedia.
          </p>
        ) : (
          <div
            role="group"
            aria-label="Daftar saksi"
            className="flex flex-col gap-2"
          >
            {elders.map((elder) => {
              const isChecked = selectedIds.has(elder.id)
              return (
                <label
                  key={elder.id}
                  className={[
                    'kiosk-card',
                    'flex items-center gap-4 cursor-pointer rounded-lg border',
                    'transition-colors',
                    isChecked
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-accent',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleWitness(elder.id)}
                    className="size-5 accent-primary shrink-0"
                    aria-label={`Pilih ${elder.name} sebagai saksi`}
                  />
                  <div className="flex flex-col">
                    <span className="text-lg font-medium text-foreground">
                      {elder.name}
                    </span>
                    {elder.email && (
                      <span className="text-sm text-muted-foreground">
                        {elder.email}
                      </span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}

        {selectedIds.size > 0 && (
          <p className="text-base text-muted-foreground">
            {selectedIds.size} saksi dipilih
          </p>
        )}
      </div>
    </StepCard>
  )
}
