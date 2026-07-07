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

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return dateFormatter.format(date);
}
