/** Role badge config for participant role values. */
export const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  head:     { label: "Kepala",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  member:   { label: "Anggota", className: "bg-sky-100 text-sky-700 border-sky-200" },
  ancestor: { label: "Leluhur", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

/**
 * Form values for the simple participant form in the standalone Participants
 * screen (name, clan picker, role, notes only).
 *
 * NOTE: There is a *separate* richer `ParticipantFormValues` in
 * `clans/types.ts` used by the Clans screen's ClanCard tree view. That type
 * also includes gender, passedAway, and relation fields. The two types are
 * intentionally different and must NOT be cross-imported.
 */
export interface ParticipantFormValues {
  name: string;
  clan: string;
  role: string;
  notes: string;
}
