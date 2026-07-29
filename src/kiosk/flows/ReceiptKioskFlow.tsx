import { KioskFlowShell, obligationTypeLabel, KioskAssetSummaryRows } from '@/kiosk/shared/KioskFlowShell'
import { RECEIPT_DRAFT_KEY } from '@/kiosk/KioskDraft'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'
import { ReceiptStep1Group } from '@/kiosk/steps/receipt/ReceiptStep1Group'
import { ReceiptStep2Receiver } from '@/kiosk/steps/receipt/ReceiptStep2Receiver'
import { ReceiptStep3Giver } from '@/kiosk/steps/receipt/ReceiptStep3Giver'
import { ReceiptStep4ObligationType } from '@/kiosk/steps/receipt/ReceiptStep4ObligationType'
import { ReceiptStep5AssetType } from '@/kiosk/steps/receipt/ReceiptStep5AssetType'
import { ReceiptStep6Amount } from '@/kiosk/steps/receipt/ReceiptStep6Amount'
import { ReceiptStep7Date } from '@/kiosk/steps/receipt/ReceiptStep7Date'
import { ReceiptStep8Witnesses } from '@/kiosk/steps/receipt/ReceiptStep8Witnesses'
import { ReceiptStep9Summary } from '@/kiosk/steps/receipt/ReceiptStep9Summary'
import { ReceiptStep10Confirm } from '@/kiosk/steps/receipt/ReceiptStep10Confirm'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReceiptKioskFlowProps {
  onExit: () => void
  onComplete: () => void
}

// ─── Initial draft factory ────────────────────────────────────────────────────

function createInitialDraft(): ReceiptKioskDraft {
  const now = Date.now()
  return {
    flowType: 'receipt',
    currentStep: 0,
    createdAt: now,
    updatedAt: now,
    groupId: null,
    groupName: null,
    receiverClanId: null,
    receiverClanName: null,
    giverClanId: null,
    giverClanName: null,
    obligationType: null,
    assetType: null,
    moneyAmount: null,
    animalTypeId: null,
    animalTypeName: null,
    animalTypePrice: null,
    quantity: null,
    dateReceived: null,
    witnessIds: [],
  }
}

// ─── Obligation type label helper ─────────────────────────────────────────────
// (Using shared obligationTypeLabel from KioskFlowShell)

// ─── Success summary rows ─────────────────────────────────────────────────────

function ReceiptSuccessSummary({ draft }: { draft: ReceiptKioskDraft }) {
  return (
    <>
      {draft.groupName && (
        <p><span className="font-semibold">Grup Acara:</span> {draft.groupName}</p>
      )}
      {draft.receiverClanName && (
        <p><span className="font-semibold">Penerima:</span> {draft.receiverClanName}</p>
      )}
      {draft.giverClanName && (
        <p><span className="font-semibold">Pemberi:</span> {draft.giverClanName}</p>
      )}
      {draft.obligationType && (
        <p>
          <span className="font-semibold">Jenis Kewajiban:</span>{' '}
          {obligationTypeLabel(draft.obligationType)}
        </p>
      )}
      <KioskAssetSummaryRows
        assetType={draft.assetType}
        moneyAmount={draft.moneyAmount}
        animalTypeName={draft.animalTypeName}
        quantity={draft.quantity}
      />
      {draft.dateReceived && (
        <p><span className="font-semibold">Tanggal:</span> {draft.dateReceived}</p>
      )}
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Receipt Kiosk Flow — orchestrates Steps 1–10 for recording a new receipt.
 * All shared shell behaviour (draft persistence, loading screen, success card,
 * exit confirmation) is handled by `KioskFlowShell`.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 5.4
 */
export function ReceiptKioskFlow({ onExit }: ReceiptKioskFlowProps) {
  return (
    <KioskFlowShell<ReceiptKioskDraft>
      draftKey={RECEIPT_DRAFT_KEY}
      createInitialDraft={createInitialDraft}
      successStep={10}
      successTitle="Penerimaan Berhasil Dicatat!"
      successSubtitle="Catatan penerimaan telah disimpan dan akan disinkronkan saat perangkat terhubung ke internet."
      renderSuccessSummary={(draft) => <ReceiptSuccessSummary draft={draft} />}
      renderStep={({ draft, onNext, onBack, isLoading }) => {
        const stepProps = { draft, onNext, onBack, isLoading }
        switch (draft.currentStep) {
          case 0: return <ReceiptStep1Group {...stepProps} />
          case 1: return <ReceiptStep2Receiver {...stepProps} />
          case 2: return <ReceiptStep3Giver {...stepProps} />
          case 3: return <ReceiptStep4ObligationType {...stepProps} />
          case 4: return <ReceiptStep5AssetType {...stepProps} />
          case 5: return <ReceiptStep6Amount {...stepProps} />
          case 6: return <ReceiptStep7Date {...stepProps} />
          case 7: return <ReceiptStep8Witnesses {...stepProps} />
          case 8: return <ReceiptStep9Summary {...stepProps} />
          case 9: return <ReceiptStep10Confirm {...stepProps} />
          default: return <ReceiptStep1Group {...stepProps} />
        }
      }}
      onExit={onExit}
    />
  )
}
