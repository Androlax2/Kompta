export const CATEGORIES = [
  "Vente",
  "Achat",
  "Métier",
  "Récolte",
  "Donjon",
  "Échange",
  "Autre",
] as const;

export type Category = (typeof CATEGORIES)[number];
