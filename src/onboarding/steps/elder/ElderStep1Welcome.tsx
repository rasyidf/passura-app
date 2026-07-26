import { StepCard } from '@/kiosk/shared/StepCard'

interface ElderStep1WelcomeProps {
  onNext: () => void
  isLoading?: boolean
}

/**
 * Elder Onboarding — Step 1: Welcome & role explanation.
 * No back button on the first step.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.10, 2.11
 */
export function ElderStep1Welcome({ onNext, isLoading }: ElderStep1WelcomeProps) {
  return (
    <StepCard
      stepIndex={0}
      totalSteps={5}
      title="Selamat Datang!"
      onNext={onNext}
      isLoading={isLoading}
    >
      <div className="space-y-4 text-lg">
        <p>
          Selamat datang di <strong>Passura</strong> — buku besar adat digital
          untuk mencatat transaksi dalam upacara Rambu Solo dan Rambu Tuka.
        </p>
        <p>
          Sebagai <strong>Sesepuh (Elder)</strong>, peran Anda sangat penting
          dalam komunitas. Anda bertugas sebagai:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Validator transaksi</strong> — memastikan setiap catatan
            pinjaman, penerimaan, dan penyerahan sudah benar.
          </li>
          <li>
            <strong>Saksi adat</strong> — memberikan keabsahan pada setiap
            pencatatan yang dilakukan dalam sistem.
          </li>
        </ul>
        <p>
          Panduan singkat ini akan membantu Anda memahami cara menggunakan
          aplikasi ini dengan mudah.
        </p>
      </div>
    </StepCard>
  )
}
