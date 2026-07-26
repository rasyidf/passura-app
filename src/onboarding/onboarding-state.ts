import type { Elder } from "../db/types";

// ─── Step Constants ───────────────────────────────────────────────────────────

export const ELDER_STEPS = [
  "elder-welcome",
  "elder-clans",
  "elder-transactions",
  "elder-kiosk-intro",
  "elder-complete",
] as const;

export const ADMIN_STEPS = [
  "admin-welcome",
  "admin-clans",
  "admin-animal-types",
  "admin-groups",
  "admin-elders",
  "admin-complete",
] as const;

export const PARTICIPANT_STEPS = [
  "participant-welcome",
  "participant-clan",
  "participant-name",
  "participant-complete",
] as const;

export type ElderStep = (typeof ELDER_STEPS)[number];
export type AdminStep = (typeof ADMIN_STEPS)[number];
export type ParticipantStep = (typeof PARTICIPANT_STEPS)[number];

// ─── OnboardingState Interface ────────────────────────────────────────────────

export interface OnboardingState {
  userId: string;
  role: Elder["role"];
  completedSteps: string[];
  isComplete: boolean;
  completedAt: number | null; // Unix timestamp (ms) or null
  skipped: boolean;
  skipSessionCount: number; // increments on each login if skipped but not permanently dismissed
  reminderDismissed: boolean; // true when user permanently dismisses reminder banner
}

// ─── Pure State Functions ─────────────────────────────────────────────────────

/**
 * Returns the index of the first step not present in completedSteps.
 * If all steps are completed, returns the index of the last step.
 *
 * Validates: Requirements 1.5, 3.7
 */
export function getResumeStep<S extends string>(
  allSteps: readonly S[],
  completedSteps: S[],
): number {
  const completedSet = new Set(completedSteps);
  const idx = allSteps.findIndex((s) => !completedSet.has(s));
  return idx === -1 ? allSteps.length - 1 : idx;
}

/**
 * Returns true when the onboarding wizard should be displayed.
 * Wizard is shown when state is null (no record) or isComplete === false.
 *
 * Validates: Requirements 1.3, 1.4
 */
export function shouldShowWizard(state: OnboardingState | null): boolean {
  if (state === null) return true;
  return !state.isComplete;
}

/**
 * Returns true when the dismissible reminder banner should be shown.
 * Shown iff skipped === true AND skipSessionCount <= 7 AND reminderDismissed === false.
 *
 * Validates: Requirement 1.7
 */
export function shouldShowReminderBanner(state: OnboardingState): boolean {
  return (
    state.skipped === true &&
    state.skipSessionCount <= 7 &&
    state.reminderDismissed === false
  );
}

/**
 * Validates that two party IDs are not the same.
 * Returns a non-empty Indonesian error string when idA === idB, empty string otherwise.
 *
 * Used for Loan (lender/borrower), Receipt (receiver/giver), Handover (fromClan/toClan).
 * Validates: Requirements 6.7, 7.4, 8.4
 */
export function validateSameParty(idA: string, idB: string): string {
  if (idA === idB) {
    return "Pemberi dan peminjam tidak boleh sama.";
  }
  return "";
}
