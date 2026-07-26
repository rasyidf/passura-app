import { StepCard } from '@/kiosk/shared/StepCard'

interface ElderStep4KioskIntroProps {
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

/**
 * Elder Onboarding — Step 4: How to access Kiosk Mode.
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6, 2.10, 2.11
 */
export function ElderStep4KioskIntro({
  onNext,
  onBack,
  isLoading,
}: ElderStep4KioskIntroProps) {
  return (
    <StepCard
      stepIndex={3}
      totalSteps={5}
      title="Mode Kios"
      onNext={onNext}
      onBack={onBack}
      isLoading={isLoading}
    >
      <div className="space-y-4 text-lg">
        <p>
          <strong>Mode Kios</strong> adalah tampilan khusus yang dirancang
          untuk Anda — layar penuh, langkah demi langkah, tanpa menu yang
          membingungkan.
        </p>
        <p>
          Dengan Mode Kios, Anda dapat mencatat Pinjaman, Penerimaan, atau
          Penyerahan hanya dengan mengetuk pilihan di layar.
        </p>

        {/* Visual cue */}
        <div className="border-2 border-primary rounded-xl p-6 flex flex-col items-center gap-3 bg-primary/5">
          <p className="font-semibold text-center">Cara membuka Mode Kios:</p>
          <ol className="list-decimal pl-6 space-y-2 w-full">
            <li>Buka halaman <strong>Dasbor</strong> utama.</li>
            <li>
              Cari tombol besar berlabel{' '}
              <span className="inline-block bg-primary text-primary-foreground font-semibold px-3 py-1 rounded-md">
                Mode Kios
              </span>{' '}
              di bagian atas halaman.
            </li>
            <li>Ketuk tombol tersebut untuk memulai.</li>
          </ol>
        </div>

        <p>
          Anda bisa keluar dari Mode Kios kapan saja dengan menekan tombol{' '}
          <strong>"Keluar Kios"</strong> yang selalu terlihat di layar.
        </p>
      </div>
    </StepCard>
  )
}
