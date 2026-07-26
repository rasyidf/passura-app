import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { StepCard } from '@/kiosk/shared/StepCard'
import { db } from '@/db/local-db'
import type { Elder } from '@/db/types'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep8SummaryProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/** Format a money amount in Indonesian locale (e.g. 1000000 → "Rp 1.000.000") */
function formatMoney(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`
}

/** Format an ISO date string with Indonesian locale */
function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'd MMMM yyyy', { locale: idLocale })
  } catch {
    return isoDate
  }
}

/**
 * Loan Kiosk Flow — Step 8: Review summary.
 *
 * Renders all human-readable labels — NO raw UUIDs in rendered output
 * (Requirement 6.4). Names are sourced from the draft fields stored in
 * previous steps (groupName, lenderClanName, borrowerClanName, animalTypeName).
 * Witness names are resolved from IndexedDB since only IDs are stored.
 *
 * Validates: Requirements 6.1, 6.4, 9.4, 10.10
 */
export function LoanStep8Summary({ draft, onNext, onBack, isLoading }: LoanStep8SummaryProps) {
  const [witnessNames, setWitnessNames] = useState<string[]>([])

  useEffect(() => {
    if (draft.witnessIds && draft.witnessIds.length > 0) {
      db.elders
        .where('id')
        .anyOf(draft.witnessIds)
        .toArray()
        .then((elders: Elder[]) => {
          // Preserve the order witnesses were selected
          const nameMap = new Map(elders.map((e) => [e.id, e.name]))
          setWitnessNames(draft.witnessIds.map((id) => nameMap.get(id) ?? id))
        })
    } else {
      setWitnessNames([])
    }
  }, [draft.witnessIds])

  async function handleNext() {
    await onNext({ currentStep: 8 })
  }

  const loanTypeLabel = draft.loanType === 'money' ? 'Uang' : 'Hewan'

  return (
    <StepCard
      stepIndex={7}
      totalSteps={9}
      title="Ringkasan Pinjaman"
      onNext={handleNext}
      onBack={onBack}
      nextLabel="Lanjut ke Konfirmasi"
      isLoading={isLoading}
    >
      <dl className="space-y-4">
        <SummaryRow label="Grup Acara" value={draft.groupName ?? '—'} />
        <SummaryRow label="Pemberi Pinjaman" value={draft.lenderClanName ?? '—'} />
        <SummaryRow label="Peminjam" value={draft.borrowerClanName ?? '—'} />
        <SummaryRow label="Jenis Pinjaman" value={loanTypeLabel} />

        {draft.loanType === 'money' && (
          <SummaryRow
            label="Jumlah"
            value={draft.moneyAmount != null ? formatMoney(draft.moneyAmount) : '—'}
          />
        )}

        {draft.loanType === 'animal' && (
          <>
            <SummaryRow label="Jenis Hewan" value={draft.animalTypeName ?? '—'} />
            <SummaryRow
              label="Jumlah"
              value={draft.quantity != null ? `${draft.quantity} ekor` : '—'}
            />
          </>
        )}

        <SummaryRow
          label="Tanggal Pinjaman"
          value={draft.dateIssued ? formatDate(draft.dateIssued) : '—'}
        />

        <SummaryRow
          label="Saksi"
          value={witnessNames.length > 0 ? witnessNames.join(', ') : 'Tidak ada'}
        />
      </dl>
    </StepCard>
  )
}

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-base font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold text-foreground">{value}</dd>
    </div>
  )
}
