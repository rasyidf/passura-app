import { useState } from "react";
import { useKiosk } from "@/kiosk/KioskContext";
import {
  LOAN_DRAFT_KEY,
  RECEIPT_DRAFT_KEY,
  HANDOVER_DRAFT_KEY,
} from "@/kiosk/KioskDraft";
import { useKioskDraft } from "@/kiosk/useKioskDraft";
import type { KioskDraftBase } from "@/kiosk/KioskDraft";

/** The three transaction types available in Kiosk Mode. */
export type KioskFlow = "loan" | "receipt" | "handover";

export interface KioskTypeSelectProps {
  setActiveFlow: (flow: KioskFlow) => void;
}

/**
 * Transaction-type selection screen for Kiosk Mode.
 *
 * Shows three `.kiosk-card` items:
 *  - "Catat Pinjaman"   → loan
 *  - "Catat Penerimaan" → receipt
 *  - "Catat Penyerahan" → handover
 *
 * If any draft exists in `appConfig`, a resume prompt is shown for that flow
 * ("Lanjutkan" resumes, "Buang" discards via `clearDraft()`).
 *
 * "Keluar Kios" always visible — calls `kiosk.exit()`.
 *
 * Requirements: 5.2, 5.3, 5.4, 5.6
 */
export function KioskTypeSelect({ setActiveFlow }: KioskTypeSelectProps) {
  const kiosk = useKiosk();

  // Load all three possible drafts so we can detect which ones exist.
  const loanDraftHook = useKioskDraft<KioskDraftBase>(LOAN_DRAFT_KEY);
  const receiptDraftHook = useKioskDraft<KioskDraftBase>(RECEIPT_DRAFT_KEY);
  const handoverDraftHook = useKioskDraft<KioskDraftBase>(HANDOVER_DRAFT_KEY);

  /**
   * Which flow currently has a resume prompt open.
   * `null` means no prompt is open.
   */
  const [resumePromptFlow, setResumePromptFlow] = useState<KioskFlow | null>(
    null
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Returns the draft hook for a given flow type. */
  function hookForFlow(flow: KioskFlow) {
    if (flow === "loan") return loanDraftHook;
    if (flow === "receipt") return receiptDraftHook;
    return handoverDraftHook;
  }

  /** Returns true when the draft for the given flow is loaded and non-null. */
  function hasDraft(flow: KioskFlow): boolean {
    return hookForFlow(flow).draft !== null;
  }

  /** Human-readable label for each flow type. */
  function flowLabel(flow: KioskFlow): string {
    if (flow === "loan") return "Catat Pinjaman";
    if (flow === "receipt") return "Catat Penerimaan";
    return "Catat Penyerahan";
  }

  // ── Card tap handler ───────────────────────────────────────────────────────

  function handleCardTap(flow: KioskFlow) {
    if (hasDraft(flow)) {
      // A draft exists — show the resume prompt for this flow.
      setResumePromptFlow(flow);
    } else {
      // No draft — jump straight into the flow.
      setActiveFlow(flow);
    }
  }

  // ── Resume prompt actions ──────────────────────────────────────────────────

  function handleResume() {
    if (!resumePromptFlow) return;
    setResumePromptFlow(null);
    setActiveFlow(resumePromptFlow);
  }

  async function handleDiscard() {
    if (!resumePromptFlow) return;
    const hook = hookForFlow(resumePromptFlow);
    await hook.clearDraft();
    setResumePromptFlow(null);
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isLoading =
    loanDraftHook.isLoading ||
    receiptDraftHook.isLoading ||
    handoverDraftHook.isLoading;

  const flows: KioskFlow[] = ["loan", "receipt", "handover"];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-background p-6 md:p-10">
      {/* Header */}
      <h1 className="kiosk-h1 mb-2">Mode Kios</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Pilih jenis transaksi yang ingin dicatat.
      </p>

      {/* Transaction type cards — Requirement 5.2 */}
      <div className="flex flex-col gap-4 flex-1">
        {isLoading ? (
          <p className="text-lg text-muted-foreground">Memuat…</p>
        ) : (
          flows.map((flow) => (
            <button
              key={flow}
              type="button"
              onClick={() => handleCardTap(flow)}
              className="kiosk-card w-full rounded-lg border border-border bg-card text-card-foreground text-left font-semibold shadow-sm hover:bg-accent hover:text-accent-foreground active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              aria-label={flowLabel(flow)}
            >
              <span>{flowLabel(flow)}</span>
              {hasDraft(flow) && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (ada draf)
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* "Keluar Kios" button — always visible, Requirement 5.4 */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => kiosk.exit()}
          className="kiosk-btn w-full rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          Keluar Kios
        </button>
      </div>

      {/* Resume prompt overlay — Requirement 5.6 */}
      {resumePromptFlow !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-prompt-title"
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-6"
        >
          <div className="w-full max-w-sm rounded-xl bg-card p-8 shadow-xl flex flex-col gap-6">
            <h2
              id="resume-prompt-title"
              className="kiosk-h1 text-card-foreground"
            >
              Lanjutkan Draf?
            </h2>
            <p className="text-lg text-card-foreground">
              Ada draf yang belum selesai untuk{" "}
              <strong>{flowLabel(resumePromptFlow)}</strong>. Ingin dilanjutkan
              atau dibuang?
            </p>

            <div className="flex flex-col gap-3">
              {/* Primary: resume */}
              <button
                type="button"
                onClick={handleResume}
                className="kiosk-btn w-full rounded-md bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[filter]"
              >
                Lanjutkan
              </button>

              {/* Secondary: discard */}
              <button
                type="button"
                onClick={handleDiscard}
                className="kiosk-btn w-full rounded-md border border-destructive text-destructive bg-background hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                Buang
              </button>

              {/* Cancel prompt — goes back to type-select without action */}
              <button
                type="button"
                onClick={() => setResumePromptFlow(null)}
                className="kiosk-btn w-full rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
