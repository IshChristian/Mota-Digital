import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { driverApi } from "./api";

export const DRIVER_LOCATION_TASK = "mota-driver-location";

// Must be defined at module load (imported from app/_layout.tsx) so Android can
// run it when the app is in the background or the screen is locked.
if (!TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(DRIVER_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const latest = data.locations[data.locations.length - 1];
    try {
      await driverApi.updateLocation({
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        heading: latest.coords.heading ?? undefined,
        speed: latest.coords.speed ?? undefined,
      });
    } catch {
      // Offline or signed out: the next fix will try again.
    }
  });
}

export type TrackingMode = "background" | "foreground" | "denied" | "off";

/**
 * Starts location sharing for an online driver. Prefers background updates
 * (keeps working with the screen locked); falls back to foreground-only.
 */
export async function startDriverTracking(onForegroundFix?: (loc: Location.LocationObject) => void): Promise<{ mode: TrackingMode; stop: () => void }> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return { mode: "denied", stop: () => {} };
  if (!(await Location.hasServicesEnabledAsync())) return { mode: "off", stop: () => {} };

  let background = false;
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status === "granted") {
      if (!(await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK))) {
        await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 15,
          timeInterval: 10_000,
          deferredUpdatesInterval: 10_000,
          pausesUpdatesAutomatically: false,
          activityType: Location.ActivityType.AutomotiveNavigation,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "MOTA: you're online",
            notificationBody: "Sharing your location so passengers can find you.",
            notificationColor: "#E63946",
            killServiceOnDestroy: false,
          },
        });
      }
      background = true;
    }
  } catch (error) {
    console.warn("Background location unavailable, using foreground updates", error);
  }

  // A foreground watcher still runs for on-screen UI (and is the only sender when background is refused).
  const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10 }, (loc) => {
    onForegroundFix?.(loc);
    if (!background) {
      void driverApi.updateLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, heading: loc.coords.heading ?? undefined, speed: loc.coords.speed ?? undefined }).catch(() => {});
    }
  });

  return {
    mode: background ? "background" : "foreground",
    stop: () => {
      sub.remove();
      if (background) void stopBackgroundTracking();
    },
  };
}

export async function stopBackgroundTracking() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  } catch { /* already stopped */ }
}
