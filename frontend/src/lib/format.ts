const kamasFormatter = new Intl.NumberFormat("fr-FR");

export function formatKamas(amount: number): string {
  return `${kamasFormatter.format(amount)} K`;
}

export function formatSignedKamas(amount: number): string {
  const sign = amount >= 0 ? "+" : "−";
  return `${sign}${kamasFormatter.format(Math.abs(amount))} K`;
}

// For the amount input: keep only digits, then group thousands the
// fr-FR way ("300000" -> "300 000"). Returns "" for no digits.
export function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digits === "") return "";
  return kamasFormatter.format(Number(digits));
}

export function parseAmountInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  return digits === "" ? NaN : Number(digits);
}

const compactFormatter = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// For chart axis ticks: "1,2 M", "300 k".
export function formatKamasCompact(amount: number): string {
  return compactFormatter.format(amount);
}

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
});

// isoMonth is "YYYY-MM" → "juil. 2026".
export function formatMonth(isoMonth: string): string {
  const date = new Date(`${isoMonth}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoMonth;
  return monthFormatter.format(date);
}

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

// For chart x-axis ticks: "7 juil."
export function formatDateShort(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return shortDateFormatter.format(date);
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - date.getTime()) / 86400000
  );
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return dateFormatter.format(date);
}
