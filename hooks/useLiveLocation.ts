import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

export type LivePosition = { latitude: number; longitude: number; heading: number | null; accuracy: number | null; at: number };
export type LocationIssue = "" | "denied" | "off" | "insecure";

const toPosition = (l: Location.LocationObject): LivePosition => ({
  latitude: l.coords.latitude,
  longitude: l.coords.longitude,
  heading: l.coords.heading != null && l.coords.heading >= 0 ? l.coords.heading : null,
  accuracy: l.coords.accuracy ?? null,
  at: l.timestamp || Date.now(),
});

/**
 * The device's live GPS position, on phones and in the browser.
 * Shows a cached fix immediately, then a fresh high-accuracy fix, then follows
 * every movement of a few metres.
 */
export function useLiveLocation(enabled = true) {
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [issue, setIssue] = useState<LocationIssue>("");
  const [attempt, setAttempt] = useState(0);
  const best = useRef<LivePosition | null>(null);

  const accept = useCallback((next: LivePosition) => {
    // Ignore an older or much less accurate reading than the one shown.
    const current = best.current;
    if (current && next.at < current.at) return;
    best.current = next;
    setIssue("");
    setPosition(next);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      if (Platform.OS === "web" && typeof window !== "undefined" && window.isSecureContext === false) { setIssue("insecure"); return; }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== "granted") { setIssue("denied"); return; }
      if (Platform.OS !== "web" && !(await Location.hasServicesEnabledAsync())) setIssue("off");
      if (Platform.OS !== "web") {
        try { const cached = await Location.getLastKnownPositionAsync({ maxAge: 60_000 }); if (cached && !cancelled) accept(toPosition(cached)); } catch { /* none cached */ }
      }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }).then((fix) => { if (!cancelled) accept(toPosition(fix)); }).catch(() => {});
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 2000 },
        (fix) => { if (!cancelled) accept(toPosition(fix)); },
      );
      if (cancelled) watcher.remove(); else sub = watcher;
    })().catch(() => { if (!cancelled) setIssue("off"); });
    return () => { cancelled = true; sub?.remove(); };
  }, [enabled, attempt, accept]);

  return { position, issue, retry: () => setAttempt((n) => n + 1) };
}
