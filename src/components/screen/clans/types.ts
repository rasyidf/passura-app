// Shared local types for the Clans screen

export type ClanFormValues = { name: string; region: string };

export type ParticipantFormValues = {
  name: string;
  clan: string;
  role: string;
  gender: string;
  passedAway: boolean;
  notes: string;
  relations: Array<{ type: string; participantId: string; notes: string }>;
};

export const ROLE_META: Record<string, { label: string; className: string }> = {
  head:     { label: "Kepala",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  member:   { label: "Anggota", className: "bg-sky-100 text-sky-700 border-sky-200" },
  ancestor: { label: "Leluhur", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

export const RELATION_TYPE_LABELS: Record<string, string> = {
  father:      "Ayah",
  mother:      "Ibu",
  spouse:      "Pasangan",
  child:       "Anak",
  sibling:     "Saudara",
  grandparent: "Kakek/Nenek",
  uncle_aunt:  "Paman/Bibi",
  cousin:      "Sepupu",
  other:       "Lainnya",
};
