type Address = { street?: string | null; name?: string | null; district?: string | null; subregion?: string | null; city?: string | null; region?: string | null };

export function formatPlace(address?: Address | null, fallback = "Selected on map") {
  if (!address) return fallback;
  const plusCode = /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,}/i;
  const street = [address.street, address.name].find((value) => value && !plusCode.test(value.trim()));
  const area = address.district || address.subregion || address.city || address.region;
  const city = address.city || address.region;
  const parts = [street || area, street ? city : address.city && area !== address.city ? address.city : null].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(", ") : fallback;
}
