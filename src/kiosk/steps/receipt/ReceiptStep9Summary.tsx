import { StepCard } from '@/kiosk/shared/StepCard'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'
import type { Receipt } from '@/db/types'

interface ReceiptStep9SummaryProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

const OBLIGATION_LABEL: Record<Receipt['obligationType'], string> = {
  ritual: 'Ritual',
  social: 'Sosial',
  wedding: 'Pernikahan',
  funeral: 'Pemakaman',
  other: 'Lainnya',
}

/**
 * Format a money amount in Indonesian locale.
 */
function formatMoney(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`
}

/**
 * Format an ISO date string in Indonesian locale.
 */
function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'd MMMM yyyy', { locale: idLocale })
  } catch {
    return isoDate
  }
}

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-border last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  )
}

/**
 * Receipt Kiosk Flow — Step 9: Review Summary.
 *
 * Displays a human-readable summary of all entered data. No raw UUIDs are shown
 * (Property 10 / Requirement 7.5).
 *
 * Validates: Requirements 7.1, 7.5, 9.1, 9.4
 */
export function ReceiptStep9Summary({ draft, onNext, onBack, isLoading }: ReceiptStep9SummaryProps) {
  async function handleNext() {
    await onNext({ currentStep: 9 })
  }

  const assetDescription =
    draft.assetType === 'money'
      ? formatMoney(draft.moneyAmount ?? 0)
      : `${draft.animalTypeName ?? '—'} × ${draft.quantity ?? '—'}`

  const dateLabel = draft.dateReceived ? formatDate(draft.dateReceived) : '—'
  const obligationLabel = draft.obligationType
    ? OBLIGATION_LABEL[draft.obligationType]
    : '—'

  return (
    <StepCard
      stepIndex={8}
      totalSteps={10}
      title="Ringkasan Penerimaan"
      onNext={handleNext}
      onBack={onBack}
      nextLabel="Konfirmasi"
      isLoading={isLoading}
    >
      <div className="flex flex-col">
        <SummaryRow label="Grup Acara" value={draft.groupName ?? '—'} />
        <SummaryRow label="Rumpun Penerima" value={draft.receiverClanName ?? '—'} />
        <SummaryRow label="Rumpun Pemberi" value={draft.giverClanName ?? '—'} />
        <SummaryRow label="Jenis Kewajiban" value={obligationLabel} />
        <SummaryRow label="Jenis Aset" value={draft.assetType === 'money' ? 'Uang' : 'Hewan'} />
        <SummaryRow label="Jumlah" value={assetDescription} />
        <SummaryRow label="Tanggal Penerimaan" value={dateLabel} />
        {draft.witnessIds.length > 0 && (
          <SummaryRow
            label="Jumlah Saksi"
            value={`${draft.witnessIds.length} orang`}
          />
        )}
      </div>
    </StepCard>
  )
}
