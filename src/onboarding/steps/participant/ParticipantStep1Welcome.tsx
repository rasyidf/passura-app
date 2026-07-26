import { StepCard } from '@/kiosk/shared/StepCard'

interface ParticipantStep1WelcomeProps {
  onNext: () => void
  isLoading?: boolean
}

/**
 * Participant Onboarding — Step 1: Welcome & role explanation in Bahasa Indonesia.
 * No back button on the first step.
 *
 * Validates: Requirements 4.1, 4.2, 4.7
 */
export function ParticipantStep1Welcome({ onNext, isLoading }: ParticipantStep1WelcomeProps) {
  return (
    <StepCard
      stepIndex={0}
      totalSteps={4}
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
          Sebagai <strong>Peserta (Participant)</strong>, Anda adalah anggota
          komunitas yang dapat melihat dan melacak kewajiban adat Anda.
        </p>
        <p>Dalam panduan singkat ini, Anda akan:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Memilih Rumpun Keluarga Anda</strong> — mengaitkan akun Anda dengan
            Tongkonan (rumah adat) yang sesuai.
          </li>
          <li>
            <strong>Mengonfirmasi nama Anda</strong> — memastikan data Anda
            sudah terdaftar dengan benar.
          </li>
          <li>
            <strong>Melihat kewajiban Anda</strong> — memantau transaksi adat
            yang berkaitan dengan Anda.
          </li>
        </ul>
        <p>
          Ikuti langkah-langkah berikut untuk menyelesaikan pengaturan profil
          Anda.
        </p>
      </div>
    </StepCard>
  )
}
