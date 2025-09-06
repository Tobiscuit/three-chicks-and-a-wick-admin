export function normalizeMoneyFromNumericString(raw: string): string {
  if (!raw) return "";
  // If there's an explicit decimal, respect and clamp to 2 places
  if (raw.includes(".")) {
    const num = Number(raw);
    return isNaN(num) ? "" : num.toFixed(2);
  }
  // Digits-only: inferred cents for 3+ digits; 1–2 digits => dollars .00
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length <= 2) {
    const dollars = Number(digits || "0");
    return `${dollars}.00`;
  }
  const dollars = Number(digits.slice(0, -2));
  const cents = digits.slice(-2);
  return `${dollars}.${cents}`;
}


