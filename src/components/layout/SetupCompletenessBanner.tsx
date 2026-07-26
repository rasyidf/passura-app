import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/auth/session";
import { db } from "@/db/local-db";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "onboarding-state";

/**
 * Non-dismissible banner shown to superadmin users when tenant setup is
 * incomplete — i.e. when the tenant has no clans, no animal types, or no
 * groups recorded in IndexedDB.
 *
 * Clicking the button resets the onboarding state's `isComplete` flag to
 * `false`, which causes `OnboardingGuard` to re-render the AdminSetupWizard.
 *
 * Only rendered for users with `role === "superadmin"`.
 * Returns null when setup is complete or the role is not superadmin.
 *
 * Validates: Requirement 3.9
 */
export function SetupCompletenessBanner() {
  const { elder } = useAuth();

  // Only render for superadmin users
  if (elder?.role !== "superadmin") {
    return null;
  }

  return <BannerContent elderId={elder.id} />;
}

/**
 * Inner component that runs the live queries.
 * Separated from the outer component so the role guard can return null cheaply
 * without running Dexie queries for non-admin users.
 */
function BannerContent({ elderId }: { elderId: string }) {
  // Reactive live counts — update automatically when IndexedDB changes
  const clanCount = useLiveQuery(() => db.clans.count(), [], 0);
  const animalTypeCount = useLiveQuery(() => db.animalTypes.count(), [], 0);
  const groupCount = useLiveQuery(() => db.groups.count(), [], 0);

  const setupComplete =
    (clanCount ?? 0) > 0 &&
    (animalTypeCount ?? 0) > 0 &&
    (groupCount ?? 0) > 0;

  // When setup is complete, render nothing
  if (setupComplete) {
    return null;
  }

  async function handleReopenWizard() {
    try {
      const record = await db.appConfig.get(ONBOARDING_KEY);
      if (record) {
        // Reset isComplete to false so OnboardingGuard re-shows the wizard
        await db.appConfig.put({
          key: ONBOARDING_KEY,
          value: {
            ...(record.value as object),
            isComplete: false,
          },
        });
      } else {
        // No existing onboarding state — create a minimal one for this user
        await db.appConfig.put({
          key: ONBOARDING_KEY,
          value: {
            userId: elderId,
            role: "superadmin",
            completedSteps: [],
            isComplete: false,
            completedAt: null,
            skipped: false,
            skipSessionCount: 0,
            reminderDismissed: false,
          },
        });
      }
    } catch {
      // If the write fails, do nothing — the user can try again
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700 p-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle
            className="size-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-[18px] font-medium text-orange-800 dark:text-orange-200 leading-snug">
            Pengaturan tenant belum lengkap. Tambahkan rumpun keluarga, jenis hewan, dan
            grup acara sebelum menggunakan aplikasi.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleReopenWizard}
          className="shrink-0 min-h-[48px] min-w-[48px] text-[18px] border-orange-400 text-orange-800 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-200 dark:hover:bg-orange-900/40"
        >
          Lengkapi Pengaturan
        </Button>
      </div>
    </div>
  );
}
