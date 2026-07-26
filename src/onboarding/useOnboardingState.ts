import { useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/local-db";
import type { OnboardingState } from "./onboarding-state";

const ONBOARDING_KEY = "onboarding-state";

/**
 * React hook that loads and manages the OnboardingState for a given userId.
 *
 * All write mutations are serialized through a single `db.appConfig.put` path.
 * Every mutation writes to IndexedDB before updating local React state, so callers
 * can rely on persistence having occurred as soon as the returned promise resolves.
 *
 * IndexedDB write errors are surfaced as rejected promises so the caller can render
 * an appropriate error UI (see Requirement 1.8).
 *
 * Validates: Requirements 1.1, 1.2, 1.5, 1.6, 1.7, 1.8
 */
export function useOnboardingState(userId: string) {
  // useLiveQuery subscribes to the appConfig table — any consumer (guard,
  // wizard) that shares the same key will re-render automatically when another
  // instance writes to IndexedDB, which is what makes the portal auto-dismiss.
  const rawRecord = useLiveQuery(
    () => db.appConfig.get(ONBOARDING_KEY),
    [ONBOARDING_KEY],
  );

  // useLiveQuery returns `undefined` while the initial query is in flight.
  const isLoading = rawRecord === undefined;

  const storedState = rawRecord?.value as OnboardingState | undefined;
  const state: OnboardingState | null =
    storedState && storedState.userId === userId ? storedState : null;

  // Serialization lock — prevents concurrent writes from interleaving.
  // All mutations acquire this lock before reading and writing to IndexedDB.
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  // ── Serialized write helper ───────────────────────────────────────────────

  /**
   * Enqueues a mutation. The `mutate` function receives the current state (or a
   * default skeleton when there is none yet) and returns the next state to persist.
   *
   * The returned promise resolves after IndexedDB has been written successfully.
   * On failure the promise rejects and local state is NOT updated.
   */
  const enqueueWrite = useCallback(
    (mutate: (current: OnboardingState) => OnboardingState): Promise<void> => {
      const next = writeQueue.current.then(async () => {
        // Read the freshest copy from IndexedDB to avoid lost-update races
        const record = await db.appConfig.get(ONBOARDING_KEY);
        const current: OnboardingState = record
          ? (record.value as OnboardingState)
          : buildDefaultState(userId);

        const updated = mutate(current);

        // Write BEFORE updating local state (Property 2 guarantee).
        // useLiveQuery will re-derive `state` automatically from IndexedDB.
        await db.appConfig.put({ key: ONBOARDING_KEY, value: updated });
      });

      writeQueue.current = next.catch(() => {
        // Reset the queue even on error so subsequent writes are not blocked
      });

      return next;
    },
    [userId],
  );

  // ── Public mutation API ───────────────────────────────────────────────────

  /**
   * Appends `stepId` to `completedSteps` (deduplicating) and persists to
   * IndexedDB before the promise resolves.
   *
   * Validates: Requirements 1.1, 2.5 (Property 2)
   */
  const completeStep = useCallback(
    (stepId: string): Promise<void> => {
      return enqueueWrite((current) => {
        const alreadyPresent = current.completedSteps.includes(stepId);
        return {
          ...current,
          completedSteps: alreadyPresent
            ? current.completedSteps
            : [...current.completedSteps, stepId],
        };
      });
    },
    [enqueueWrite],
  );

  /**
   * Marks onboarding as fully complete, recording the current timestamp.
   *
   * Validates: Requirement 1.2
   */
  const completeAll = useCallback((): Promise<void> => {
    return enqueueWrite((current) => ({
      ...current,
      isComplete: true,
      completedAt: Date.now(),
    }));
  }, [enqueueWrite]);

  /**
   * Skips the entire wizard: sets `isComplete: true`, `skipped: true`, and
   * clears `completedSteps`.
   *
   * Validates: Requirement 1.6
   */
  const skip = useCallback((): Promise<void> => {
    return enqueueWrite((current) => ({
      ...current,
      isComplete: true,
      skipped: true,
      completedSteps: [],
      completedAt: Date.now(),
    }));
  }, [enqueueWrite]);

  /**
   * Permanently suppresses the reminder banner for this user.
   *
   * Validates: Requirement 1.7
   */
  const dismissReminder = useCallback((): Promise<void> => {
    return enqueueWrite((current) => ({
      ...current,
      reminderDismissed: true,
    }));
  }, [enqueueWrite]);

  /**
   * Increments `skipSessionCount` by 1 (called on each login while skipped
   * but not permanently dismissed).
   *
   * Validates: Requirement 1.7
   */
  const incrementSessionCount = useCallback((): Promise<void> => {
    return enqueueWrite((current) => ({
      ...current,
      skipSessionCount: current.skipSessionCount + 1,
    }));
  }, [enqueueWrite]);

  /**
   * Resets the wizard by setting `isComplete: false`, allowing the
   * `OnboardingGuard` to re-display the wizard portal.
   *
   * Used by `OnboardingReminderBanner` when the user taps "Mulai Panduan".
   *
   * Validates: Requirement 1.7
   */
  const resetWizard = useCallback((): Promise<void> => {
    return enqueueWrite((current) => ({
      ...current,
      isComplete: false,
      skipped: false,
      completedAt: null,
    }));
  }, [enqueueWrite]);

  return {
    state,
    isLoading,
    completeStep,
    completeAll,
    skip,
    dismissReminder,
    incrementSessionCount,
    resetWizard,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a minimal default OnboardingState skeleton when no record exists yet.
 * The role is intentionally left as `"participant"` (the most restricted role);
 * the wizard components supply the actual role from auth context when first persisting.
 */
function buildDefaultState(userId: string): OnboardingState {
  return {
    userId,
    role: "participant",
    completedSteps: [],
    isComplete: false,
    completedAt: null,
    skipped: false,
    skipSessionCount: 0,
    reminderDismissed: false,
  };
}
