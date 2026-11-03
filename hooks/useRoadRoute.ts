import { useEffect, useRef, useState } from "react";
import { mapsApi, type RouteResult } from "@/services/api";
import { decodePolyline, haversineKm } from "@/utils/geo";

type Point = { latitude: number; longitude: number };
export type RoadRoute = { points: Point[]; distanceKm: number; durationMin: number; road: boolean; result: RouteResult | null };

/**
 * Road route from a moving origin to a target. Asks the server again only when
 * the target changes or the origin has moved `refreshKm` from where the last
 * route started; meanwhile the remaining distance follows the origin live.
 */
export function useRoadRoute(origin: Point | null | undefined, target: Point | null | undefined, refreshKm = 0.25) {
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const from = useRef<{ origin: Point; key: string } | null>(null);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current += 1; }, []);
  const targetKey = target ? `${target.latitude.toFixed(5)},${target.longitude.toFixed(5)}` : "";

  useEffect(() => {
    if (!origin || !target) { setRoute(null); from.current = null; requestId.current += 1; return; }
    const last = from.current;
    if (last && last.key === targetKey && haversineKm(last.origin, origin) < refreshKm) return;
    from.current = { origin, key: targetKey };
    const id = ++requestId.current;
    const straight = haversineKm(origin, target);
    // Show a straight line at once; replace it with the road when it arrives.
    if (!last || last.key !== targetKey) setRoute({ points: [origin, target], distanceKm: straight, durationMin: Math.max(1, Math.round((straight / 25) * 60)), road: false, result: null });
    mapsApi.getRoute(origin, target)
      .then((res) => {
        const r = res.data.data;
        if (id !== requestId.current || !r?.encodedPolyline) return;
        setRoute({ points: decodePolyline(r.encodedPolyline), distanceKm: r.distanceMeters / 1000, durationMin: Math.max(1, Math.round(r.durationSeconds / 60)), road: true, result: r });
      })
      .catch(() => {});
  }, [origin?.latitude, origin?.longitude, targetKey]);

  return route;
}

/** Remaining distance/time, scaled from the last road route as the origin moves. */
export function remaining(route: RoadRoute | null, origin: Point | null | undefined, target: Point | null | undefined) {
  if (!origin || !target) return null;
  const straight = haversineKm(origin, target);
  if (!route) return { km: straight, min: Math.max(1, Math.round((straight / 25) * 60)) };
  const startStraight = haversineKm(route.points[0], target) || straight || 1;
  const ratio = Math.min(1.5, Math.max(0, straight / startStraight));
  const km = Math.max(straight, route.distanceKm * ratio);
  return { km, min: Math.max(1, Math.round(route.durationMin * ratio)) };
}
