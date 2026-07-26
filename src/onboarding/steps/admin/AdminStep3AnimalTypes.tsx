import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { animalTypesRepo } from '@/db/repositories'
import type { AnimalType } from '@/db/types'

interface AdminStep3AnimalTypesProps {
  onNext: () => void
  onBack?: () => void
  isLoading?: boolean
}

const QUALITY_LABELS: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  unique: 'Unik',
}

/**
 * Admin Setup — Step 3: Add AnimalType records.
 * "Lanjut" is disabled when animal type count === 0.
 *
 * Validates: Requirements 3.2, 3.4, 3.6, 3.10
 */
export function AdminStep3AnimalTypes({ onNext, onBack, isLoading }: AdminStep3AnimalTypesProps) {
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'buffalo' | 'pig'>('buffalo')
  const [breed, setBreed] = useState('')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'unique'>('medium')
  const [price, setPrice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [navError, setNavError] = useState<string | null>(null)

  // Load existing animal types on mount
  useEffect(() => {
    animalTypesRepo.getAll().then(setAnimalTypes)
  }, [])

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setSaveError(null)
    setIsSaving(true)
    try {
      const created = await animalTypesRepo.create({
        name: trimmedName,
        category,
        breed: breed.trim() || '-',
        quality,
        price: price ? parseFloat(price) : 0,
      })
      setAnimalTypes((prev) => [...prev, created])
      setName('')
      setBreed('')
      setPrice('')
      setCategory('buffalo')
      setQuality('medium')
    } catch {
      setSaveError('Gagal menyimpan jenis hewan. Coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleNext() {
    if (animalTypes.length === 0) {
      setNavError('Tambahkan minimal satu jenis hewan untuk melanjutkan.')
      return
    }
    setNavError(null)
    onNext()
  }

  return (
    <StepCard
      stepIndex={2}
      totalSteps={6}
      title="Tambah Jenis Hewan"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={false}
      isLoading={isLoading}
    >
      <div className="space-y-6">
        <p className="text-lg">
          Tambahkan setidaknya satu jenis hewan (kerbau atau babi) untuk digunakan
          dalam pencatatan transaksi.
        </p>

        {/* Inline mini-form */}
        <div className="space-y-3 rounded-md border border-input p-4">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="animal-name" className="text-lg font-medium">
              Nama <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <input
              id="animal-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kerbau Bonga"
              className="w-full rounded-md border border-input bg-card text-foreground shadow-xs px-3 py-2 text-lg outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              aria-required="true"
            />
          </div>

          {/* Category — named card buttons, no raw <select> */}
          <div className="space-y-1">
            <span className="text-lg font-medium">
              Kategori <span aria-hidden="true" className="text-destructive">*</span>
            </span>
            <div className="flex gap-3" role="group" aria-label="Pilih kategori hewan">
              {(['buffalo', 'pig'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`kiosk-btn flex-1 rounded-md border text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    category === cat
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground hover:bg-accent'
                  }`}
                  aria-pressed={category === cat}
                >
                  {cat === 'buffalo' ? 'Kerbau' : 'Babi'}
                </button>
              ))}
            </div>
          </div>

          {/* Breed (optional) */}
          <div className="space-y-1">
            <label htmlFor="animal-breed" className="text-lg font-medium">
              Ras <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              id="animal-breed"
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="Contoh: Bonga"
              className="w-full rounded-md border border-input bg-card text-foreground shadow-xs px-3 py-2 text-lg outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          {/* Quality (optional) */}
          <div className="space-y-1">
            <span className="text-lg font-medium">
              Kualitas <span className="text-muted-foreground font-normal">(opsional)</span>
            </span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pilih kualitas">
              {(['low', 'medium', 'high', 'unique'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`kiosk-btn rounded-md border text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    quality === q
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-foreground hover:bg-accent'
                  }`}
                  aria-pressed={quality === q}
                >
                  {QUALITY_LABELS[q]}
                </button>
              ))}
            </div>
          </div>

          {/* Price (optional) */}
          <div className="space-y-1">
            <label htmlFor="animal-price" className="text-lg font-medium">
              Harga (Rp) <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              id="animal-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min={0}
              className="w-full rounded-md border border-input bg-card text-foreground shadow-xs px-3 py-2 text-lg outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          {saveError && <KioskErrorBanner message={saveError} />}
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="kiosk-btn rounded-md bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 transition-[filter]"
          >
            {isSaving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>

        {/* Saved animal types list */}
        {animalTypes.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Jenis hewan tersimpan ({animalTypes.length})
            </h2>
            <ul className="space-y-2" aria-label="Daftar jenis hewan">
              {animalTypes.map((at) => (
                <li
                  key={at.id}
                  className="kiosk-card flex items-center justify-between rounded-md border border-input bg-background px-4"
                >
                  <div>
                    <span className="font-medium text-lg">{at.name}</span>
                    <span className="ml-2 text-muted-foreground text-base">
                      ({at.category === 'buffalo' ? 'Kerbau' : 'Babi'})
                    </span>
                  </div>
                  <span className="text-muted-foreground text-base">
                    {QUALITY_LABELS[at.quality]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation error */}
        {navError && <KioskErrorBanner message={navError} />}
      </div>
    </StepCard>
  )
}
