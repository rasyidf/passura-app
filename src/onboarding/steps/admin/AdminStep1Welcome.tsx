import { StepCard } from '@/kiosk/shared/StepCard'

interface AdminStep1WelcomeProps {
  onNext: () => void
  isLoading?: boolean
}

/**
 * Admin Setup — Step 1: Setup overview card.
 * No back button on the first step.
 *
 * Validates: Requirements 3.1, 3.2, 3.10
 */
export function AdminStep1Welcome({ onNext, isLoading }: AdminStep1WelcomeProps) {
  return (
    <StepCard
      stepIndex={0}
      totalSteps={6}
      title="Selamat Datang, Admin!"
      onNext={onNext}
      isLoading={isLoading}
    >
      <div className="space-y-4 text-lg">
        <p>
          Sebelum aplikasi dapat digunakan oleh anggota komunitas, Anda perlu
          melengkapi beberapa data dasar terlebih dahulu.
        </p>
        <p>Panduan ini akan membantu Anda menyiapkan:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Rumpun Keluarga (Tongkonan)</strong> — unit rumah tangga atau garis
            keturunan dalam komunitas.
          </li>
          <li>
            <strong>Jenis Hewan</strong> — kategori ternak (kerbau atau babi)
            yang digunakan dalam upacara.
          </li>
          <li>
            <strong>Grup Acara</strong> — kelompok yang mencakup lingkup suatu
            upacara adat.
          </li>
          <li>
            <strong>Akun Sesepuh</strong> — konfirmasi akun validator komunitas
            (opsional).
          </li>
        </ul>
        <p>
          Semua data disimpan secara lokal dan dapat digunakan tanpa koneksi
          internet.
        </p>
        <p>Tekan <strong>Lanjut</strong> untuk memulai pengaturan.</p>
      </div>
    </StepCard>
  )
}
