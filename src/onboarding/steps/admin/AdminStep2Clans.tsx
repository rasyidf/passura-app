import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { clansRepo } from '@/db/repositories'
import type { Clan } from '@/db/types'

interface AdminStep2ClansProps {
  onNext: () => void
  onBack?: () => void
  isLoading?: boolean
}

/**
 * Admin Setup — Step 2: Add Clan records.
 * "Lanjut" is disabled when clan count === 0.
 *
 * Validates: Requirements 3.2, 3.3, 3.6, 3.10
 */
export function AdminStep2Clans({ onNext, onBack, isLoading }: AdminStep2ClansProps) {
  const [clans, setClans] = useState<Clan[]>([])
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [navError, setNavError] = useState<string | null>(null)

  // Load existing clans on mount
  useEffect(() => {
    clansRepo.getAll().then(setClans)
  }, [])

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setSaveError(null)
    setIsSaving(true)
    try {
      const created = await clansRepo.create({ name: trimmedName, region: region.trim() || undefined })
      setClans((prev) => [...prev, created])
      setName('')
      setRegion('')
    } catch {
      setSaveError('Gagal menyimpan clan. Coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleNext() {
    if (clans.length === 0) {
      setNavError('Tambahkan minimal satu clan untuk melanjutkan.')
      return
    }
    setNavError(null)
    onNext()
  }

  return (
    <StepCard
      stepIndex={1}
      totalSteps={6}
      title="Tambah Clan"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={false}
      isLoading={isLoading}
    >
      <div className="space-y-6">
        <p className="text-lg">
          Tambahkan setidaknya satu Clan (Tongkonan) untuk komunitas Anda.
        </p>

        {/* Inline mini-form */}
        <div className="space-y-3 rounded-md border border-input p-4">
          <div className="space-y-1">
            <label htmlFor="clan-name" className="text-lg font-medium">
              Nama Clan <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <input
              id="clan-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Tongkonan Buntu"
              className="w-full rounded-md border border-input bg-card text-foreground shadow-xs px-3 py-2 text-lg outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              aria-required="true"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="clan-region" className="text-lg font-medium">
              Daerah <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              id="clan-region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Contoh: Toraja Utara"
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

        {/* Saved clans list */}
        {clans.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Clan tersimpan ({clans.length})
            </h2>
            <ul className="space-y-2" aria-label="Daftar clan">
              {clans.map((clan) => (
                <li
                  key={clan.id}
                  className="kiosk-card flex items-center justify-between rounded-md border border-input bg-background px-4"
                >
                  <span className="font-medium text-lg">{clan.name}</span>
                  {clan.region && (
                    <span className="text-muted-foreground text-base">{clan.region}</span>
                  )}
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
