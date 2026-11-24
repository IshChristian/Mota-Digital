import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { ridesApi } from "@/services/api";
import { startRideAlert, stopRideAlert } from "@/services/rideAlert";
import { useRealtimeEvent, useRealtimeStatus } from "@/hooks/useRealtime";
import { addOffer, offerId, removeOffer, syncOffers, type RideOffer } from "@/utils/rideOffers";

/**
 * Every ride request open to this driver. Live events add and remove them; the server's list
 * corrects whatever the live connection missed (signal lost, app in the background).
 */
export function useRideOffers(enabled: boolean) {
  const [offers, setOffers] = useState<RideOffer[]>([]);
  const current = useRef<RideOffer[]>([]);
  const closed = useRef(new Map<string, number>());
  const loading = useRef(false);
  const active = useRef(enabled);
  active.current = enabled;
  const status = useRealtimeStatus();

  const apply = useCallback((next: RideOffer[]) => {
    const known = new Set(current.current.map(offerId));
    const added = next.filter((o) => !known.has(offerId(o)));
    current.current = next;
    setOffers(next);
    if (added.length) void startRideAlert(offerId(added[added.length - 1]));
    if (!next.length) stopRideAlert();
  }, []);

  const close = useCallback((id: unknown) => {
    closed.current.set(String(id), Date.now());
    stopRideAlert(String(id));
    apply(removeOffer(current.current, id));
  }, [apply]);

  const refresh = useCallback(async () => {
    if (!active.current || loading.current) return;
    loading.current = true;
    try {
      const response = await ridesApi.getDriverRequests();
      const list = response.data?.data ?? response.data?.requests ?? response.data;
      if (active.current && Array.isArray(list)) apply(syncOffers(current.current, list, closed.current, Date.now()));
    } catch { /* Offline: the next refresh tries again. */ } finally { loading.current = false; }
  }, [apply]);

  const clear = useCallback(() => apply([]), [apply]);

  useRealtimeEvent("ride_request", (request) => {
    closed.current.delete(offerId(request));
    apply(addOffer(current.current, request, Date.now()));
  });
  useRealtimeEvent("ride_request_closed", (data) => close(data?.rideId));

  useEffect(() => {
    if (!enabled) { clear(); return; }
    void refresh();
    const timer = setInterval(() => void refresh(), 10_000);
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [enabled, refresh, clear]);
  // After a reconnect, anything sent while offline is only in the list.
  useEffect(() => { if (status === "connected") void refresh(); }, [status, refresh]);

  return { offers, close, clear, refresh };
}
