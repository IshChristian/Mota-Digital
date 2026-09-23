export const RWANDA_COUNTRY_CODE = "+250";

export function rwandaLocalDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("250")) return digits.slice(3, 12);
  if (digits.startsWith("0")) return digits.slice(1, 10);
  return digits.slice(0, 9);
}

export function normalizeRwandaPhone(value: string) {
  const local = rwandaLocalDigits(value);
  return local.length === 9 && local.startsWith("7")
    ? `${RWANDA_COUNTRY_CODE}${local}`
    : "";
}

export function isRwandaPhone(value: string) {
  return /^\+2507\d{8}$/.test(normalizeRwandaPhone(value));
}
