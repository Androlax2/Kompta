export const CATEGORIES = [
  "Vente",
  "Achat",
  "Forgemagie",
  "Métier",
  "Récolte",
  "Donjon",
  "Échange",
  "Autre",
] as const;

export type Category = (typeof CATEGORIES)[number];
