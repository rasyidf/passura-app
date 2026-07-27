/**
 * Shared helpers used by multiple CRUD screen components.
 *
 * Extracted to avoid copy-paste across HandoversScreen, ReceiptsScreen,
 * ObligationsScreen, LoansScreen, and ParticipantsScreen.
 */

import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

// ─── Shared link components ───────────────────────────────────────────────────

/** Renders a clan name as an internal link to /dashboard/clans. */
export function ClanLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      to="/dashboard/clans"
      className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 font-medium text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {name || id}
      <ExternalLink className="size-3 opacity-60" />
    </Link>
  );
}

/** Renders an animal type name as an internal link to /dashboard/animal-types. */
export function AnimalLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      to="/dashboard/animal-types"
      className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {name || id}
      <ExternalLink className="size-3 opacity-60" />
    </Link>
  );
}

// ─── Shared constants ─────────────────────────────────────────────────────────

export const OBLIGATION_TYPES = [
  { value: "ritual",   label: "Ritual" },
  { value: "social",   label: "Sosial" },
  { value: "wedding",  label: "Pernikahan" },
  { value: "funeral",  label: "Pemakaman" },
  { value: "other",    label: "Lainnya" },
];

export const OBLIGATION_BADGE: Record<string, { label: string; className: string }> = {
  ritual:  { label: "Ritual",     className: "bg-amber-100 text-amber-700 border-amber-200" },
  social:  { label: "Sosial",     className: "bg-sky-100 text-sky-700 border-sky-200" },
  wedding: { label: "Pernikahan", className: "bg-pink-100 text-pink-700 border-pink-200" },
  funeral: { label: "Pemakaman",  className: "bg-slate-100 text-slate-700 border-slate-200" },
  other:   { label: "Lainnya",    className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export const ASSET_BADGE: Record<string, { label: string; className: string }> = {
  money:  { label: "Uang",  className: "bg-green-100 text-green-700 border-green-200" },
  animal: { label: "Hewan", className: "bg-orange-100 text-orange-700 border-orange-200" },
};
