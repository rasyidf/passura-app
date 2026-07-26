import { useAuth } from "@/auth/session";
import { useOnboardingState } from "@/onboarding/useOnboardingState";
import { shouldShowReminderBanner } from "@/onboarding/onboarding-state";
import { X, BookOpen } from "lucide-react";

/**
 * Dismissible reminder banner shown when the user previously skipped onboarding.
 * Visible for up to 7 login sessions; permanently hidden after the user dismisses it.
 *
 * Validates: Requirement 1.7
 */
export function OnboardingReminderBanner() {
  const { elder } = useAuth();
  const { state, dismissReminder, resetWizard } = useOnboardingState(
    elder?.id ?? "",
  );

  if (!state || !shouldShowReminderBanner(state)) return null;

  async function handleRestart() {
    await resetWizard();
    // OnboardingGuard will pick up the updated state and re-show the wizard portal
  }

  async function handleDismiss() {
    await dismissReminder();
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-700 p-4"
    >
      <div className="flex items-start gap-3">
        <BookOpen className="size-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Panduan onboarding tersedia
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-300">
            Anda melewati panduan sebelumnya. Ingin memulai lagi?
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRestart}
            className="kiosk-btn text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Mulai Panduan
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Tutup selamanya"
            className="kiosk-btn flex items-center justify-center text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
