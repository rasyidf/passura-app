import { StepCard } from '@/kiosk/shared/StepCard'

interface ElderStep3TransactionsProps {
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

/**
 * Elder Onboarding — Step 3: Explanation of Loan, Receipt, Handover concepts.
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6, 2.10, 2.11
 */
export function ElderStep3Transactions({
  onNext,
  onBack,
  isLoading,
}: ElderStep3TransactionsProps) {
  return (
    <StepCard
      stepIndex={2}
      totalSteps={5}
      title="Pencatatan Transaksi"
      onNext={onNext}
      onBack={onBack}
      isLoading={isLoading}
    >
      <div className="space-y-5 text-lg">
        <p>
          Ada tiga jenis transaksi yang dapat Anda catat dalam aplikasi ini:
        </p>

        <div className="space-y-4">
          {/* Pinjaman */}
          <div className="bg-muted rounded-lg p-4 space-y-1">
            <p className="font-semibold text-xl">Pinjaman</p>
            <p>
              Catatan kewajiban antara dua Rumpun — misalnya, satu Rumpun
              meminjamkan uang atau hewan kepada Rumpun lain dan akan
              dikembalikan di kemudian hari.
            </p>
          </div>

          {/* Penerimaan */}
          <div className="bg-muted rounded-lg p-4 space-y-1">
            <p className="font-semibold text-xl">Penerimaan</p>
            <p>
              Catatan donasi atau aset yang diterima oleh satu Rumpun dari Rumpun
              lain, biasanya sebagai bagian dari kewajiban adat dalam sebuah
              upacara.
            </p>
          </div>

          {/* Penyerahan */}
          <div className="bg-muted rounded-lg p-4 space-y-1">
            <p className="font-semibold text-xl">Penyerahan</p>
            <p>
              Catatan penyerahan aset secara resmi dari satu Rumpun kepada Rumpun
              lain, menandai selesainya suatu kewajiban adat.
            </p>
          </div>
        </div>
      </div>
    </StepCard>
  )
}
