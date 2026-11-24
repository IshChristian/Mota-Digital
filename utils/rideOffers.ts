// The driver's open ride requests. Pure functions so they can be tested without the app.
export type RideOffer = { id?: string; _id?: string; rideId?: string; receivedAt: number; [key: string]: any };

export const offerId = (item: any) => String(item?._id ?? item?.id ?? item?.rideId ?? "");

/** A live event can arrive while an older list is still loading; keep it this long without the list's agreement. */
export const FRESH_MS = 10_000;

/** Adds a request, or refreshes it in place (a raised offer) so the one on screen never jumps. */
export function addOffer(offers: RideOffer[], item: any, now: number): RideOffer[] {
  const id = offerId(item);
  if (!id) return offers;
  const index = offers.findIndex((o) => offerId(o) === id);
  if (index < 0) return [...offers, { ...item, receivedAt: now }];
  return offers.map((o, i) => (i === index ? { ...o, ...item, receivedAt: now } : o));
}

export const removeOffer = (offers: RideOffer[], id: unknown) => offers.filter((o) => offerId(o) !== String(id));

/** Makes the open requests match the server's list. `closed` are ids already answered or closed here. */
export function syncOffers(offers: RideOffer[], list: any[], closed: Map<string, number>, now: number): RideOffer[] {
  const open = list.filter((item) => offerId(item) && !(now - (closed.get(offerId(item)) ?? -Infinity) < FRESH_MS));
  const ids = new Set(open.map(offerId));
  const kept = offers.filter((o) => ids.has(offerId(o)) || now - o.receivedAt < FRESH_MS);
  // Keep the original receivedAt: only a live event makes an offer "fresh".
  return open.reduce<RideOffer[]>((all, item) => {
    const current = all.find((o) => offerId(o) === offerId(item));
    return addOffer(all, item, current?.receivedAt ?? 0).map((o) => (offerId(o) === offerId(item) ? { ...o, receivedAt: current?.receivedAt ?? 0 } : o));
  }, kept);
}
