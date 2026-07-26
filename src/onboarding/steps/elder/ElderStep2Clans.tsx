import { StepCard } from '@/kiosk/shared/StepCard'

interface ElderStep2ClansProps {
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

/**
 * Elder Onboarding — Step 2: What is a Clan (Tongkonan)?
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6, 2.10, 2.11
 */
export function ElderStep2Clans({ onNext, onBack, isLoading }: ElderStep2ClansProps) {
  return (
    <StepCard
      stepIndex={1}
      totalSteps={5}
      title="Apa itu Clan?"
      onNext={onNext}
      onBack={onBack}
      isLoading={isLoading}
    >
      <div className="space-y-4 text-lg">
        <p>
          Dalam aplikasi ini, <strong>Clan</strong> (juga dikenal sebagai{' '}
          <strong>Tongkonan</strong>) adalah unit rumah tangga atau garis
          keturunan dalam komunitas adat Toraja.
        </p>
        <p>
          Setiap transaksi adat — seperti pinjaman, penerimaan, atau
          penyerahan hewan — selalu melibatkan dua Clan: pihak yang memberi
          dan pihak yang menerima.
        </p>
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p className="font-semibold">Contoh:</p>
          <p>
            Tongkonan A memberikan seekor kerbau kepada Tongkonan B sebagai
            bagian dari upacara Rambu Solo. Catatan ini tersimpan sebagai
            transaksi antara dua Clan.
          </p>
        </div>
        <p>
          Daftar Clan yang tersedia di aplikasi sudah disiapkan oleh admin
          komunitas Anda.
        </p>
      </div>
    </StepCard>
  )
}
