export type Point = { latitude: number; longitude: number };

/** Accepts {latitude,longitude} or {lat,lng}; undefined when missing. */
export function toPoint(location: any): Point | undefined {
  const latitude = Number(location?.latitude ?? location?.lat);
  const longitude = Number(location?.longitude ?? location?.lng);
  return location && Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== 0 || longitude !== 0) ? { latitude, longitude } : undefined;
}

export function placeName(location: any, fallback: string) {
  if (typeof location === "string") return location;
  return location?.name || location?.address || fallback;
}

export const requestId = (item: any) => String(item?._id ?? item?.id ?? item?.rideId ?? "");
export const requestFare = (item: any) => Number(item?.offeredFare ?? item?.fare ?? 0);
