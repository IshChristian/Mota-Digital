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

/**
 * A readable name for a point: the phone's own geocoder first, then MOTA's server
 * (the only option in browsers, where expo-location can't reverse-geocode).
 */
export async function nameForPoint(point: { latitude: number; longitude: number }, fallback: string): Promise<string> {
  const { Platform } = await import("react-native");
  if (Platform.OS !== "web") {
    try {
      const Location = await import("expo-location");
      const [g] = await Location.reverseGeocodeAsync(point);
      const name = formatPlace(g, "");
      if (name) return name;
    } catch { /* fall through to the server */ }
  }
  try {
    const { mapsApi } = await import("@/services/api");
    const res = await mapsApi.reverse(point);
    const place = res.data?.data;
    if (place?.name && place.name !== "Selected location") return place.name;
  } catch { /* keep the fallback */ }
  return fallback;
}
