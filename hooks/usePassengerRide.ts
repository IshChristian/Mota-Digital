import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { ridesApi } from "@/services/api";
import { useRealtimeEvent, useRealtimeStatus } from "@/hooks/useRealtime";

export type RideView = {
  _id: string;
  rideStatus: string;
  rideType: "ride" | "parcel";
  vehicleType: "motor" | "car";
  passengers: number;
  pickup: { name: string; latitude: number; longitude: number };
  destination: { name: string; latitude: number; longitude: number };
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  fare: number;
  maximumFare?: number;
  tipAmount?: number;
  paymentMethod: "cash" | "momo" | "wallet";
  paymentStatus: string;
  ridePin?: string;
  counterOffers?: Array<{ _id: string; amount: number; driverId: string; createdAt: string }>;
  driver?: {
    _id: string; firstName: string; lastName?: string; avatarUrl?: string; rating?: number; ratingCount?: number; totalRides?: number;
    plate?: string; vehicleType?: string; vehicleMake?: string; vehicleColor?: string; phone?: string;
    lastLocation?: { latitude: number; longitude: number; heading?: number }; lastLocationAt?: string;
  };
  parcel?: { recipientName: string; recipientPhone?: string; description?: string; size?: string };
  requestedAt?: string;
  passengerRating?: number;
};

export type CounterOfferEvent = { rideId: string; offerId: string; amount: number; driver: { firstName: string; rating?: number; plate?: string; vehicleType?: string; distanceKm?: number | null } };

const FINISHED = ["completed", "cancelled", "expired"];

/**
 * The passenger's current ride, owned by the server. Restores after an app
 * restart, follows live events, and polls slowly as a safety net (faster when
 * the live stream is down).
 */
export function usePassengerRide() {
  const [ride, setRide] = useState<RideView | null>(null);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState<RideView | null>(null);
  const [notifiedDrivers, setNotifiedDrivers] = useState<number | null>(null);
  const [offers, setOffers] = useState<CounterOfferEvent[]>([]);
  const rideRef = useRef<RideView | null>(null);
  rideRef.current = ride;
  const live = useRealtimeStatus() === "connected";

  const refresh = useCallback(async () => {
    try {
      const active: RideView | null = (await ridesApi.getActiveRide()).data?.data ?? null;
      const previous = rideRef.current;
      if (!active && previous) {
        // The ride ended since we last looked: load its final state for the summary/rating sheet.
        try {
          const last = (await ridesApi.getRideDetails(previous._id)).data?.data?.ride as RideView;
          if (last && FINISHED.includes(last.rideStatus)) setFinished(last);
        } catch { /* The summary is optional. */ }
        setOffers([]);
        setNotifiedDrivers(null);
      }
      setRide(active);
    } catch (error) {
      console.warn("Active ride refresh failed", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => sub.remove();
  }, [refresh]);
  useEffect(() => {
    if (!ride) return;
    const every = live ? 20_000 : ride.rideStatus === "searching" ? 5_000 : 4_000;
    const timer = setInterval(() => void refresh(), every);
    return () => clearInterval(timer);
  }, [ride?._id, ride?.rideStatus, live, refresh]);

  const isMine = (data: any) => rideRef.current && String(data?.rideId) === String(rideRef.current._id);
  useRealtimeEvent("rideUpdate", (data) => { if (isMine(data) || !rideRef.current) void refresh(); });
  useRealtimeEvent("rideCompleted", () => void refresh());
  useRealtimeEvent("paymentUpdate", (data) => { if (isMine(data)) void refresh(); });
  useRealtimeEvent("driverLocation", (data) => {
    if (!isMine(data)) return;
    setRide((current) => current?.driver ? { ...current, driver: { ...current.driver, lastLocation: { latitude: data.latitude, longitude: data.longitude, heading: data.heading }, lastLocationAt: data.at } } : current);
  });
  useRealtimeEvent("counterOffer", (data: CounterOfferEvent) => {
    if (!isMine(data)) return;
    setOffers((list) => [...list.filter((o) => o.offerId !== data.offerId), data]);
  });

  return {
    ride,
    loading,
    finished,
    offers,
    notifiedDrivers,
    clearFinished: () => setFinished(null),
    dismissOffer: (offerId: string) => setOffers((list) => list.filter((o) => o.offerId !== offerId)),
    started: (next: RideView | null, notified?: number) => { setRide(next); setNotifiedDrivers(notified ?? null); setOffers([]); },
    setNotifiedDrivers,
    refresh,
  };
}
