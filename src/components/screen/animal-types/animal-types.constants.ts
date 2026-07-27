/** Quality badge config for animal type quality values. */
export const QUALITY_BADGE: Record<string, { label: string; className: string }> = {
  low:    { label: "Rendah",      className: "bg-slate-100 text-slate-700 border-slate-200" },
  medium: { label: "Sedang",      className: "bg-blue-100 text-blue-700 border-blue-200" },
  high:   { label: "Tinggi",      className: "bg-green-100 text-green-700 border-green-200" },
  unique: { label: "Unik/Langka", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

/** Form field shape for the animal type create / edit dialog. */
export interface AnimalTypeFormValues {
  name: string;
  category: string;
  breed: string;
  geneticLine: string;
  quality: string;
  price: string;
}
