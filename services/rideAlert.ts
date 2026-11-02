// Alert for a new ride request while the app is open: MOTA's own sound on a loop
// plus a long repeating vibration, until the driver answers or 30 s pass.
// With the screen locked / phone in a pocket, the "ride_requests" notification
// channel does the same job (see pushNotifications.ts).
import { Platform, Vibration } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

export const RIDE_REQUEST_SOUND = "mota_ride_request.wav";
// Long buzzes with short gaps: easy to feel through a pocket, unlike a short notification tick.
export const RIDE_REQUEST_VIBRATION = [0, 800, 400, 800, 400, 800, 1200];
const MAX_ALERT_MS = 30_000;

let player: AudioPlayer | null = null;
let activeRideId: string | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

function getPlayer() {
  if (!player) {
    player = createAudioPlayer(require("../assets/sounds/mota_ride_request.wav"));
    player.loop = true;
    player.volume = 1;
  }
  return player;
}

/** Starts the alert for this ride. Repeated calls for the same ride (live event + push) don't restart it. */
export async function startRideAlert(rideId?: string | null) {
  const id = rideId ? String(rideId) : "unknown";
  if (activeRideId === id) return;
  stopRideAlert();
  activeRideId = id;
  Vibration.vibrate(RIDE_REQUEST_VIBRATION, true);
  stopTimer = setTimeout(stopRideAlert, MAX_ALERT_MS);
  try {
    // Plays even when the ringer switch is on silent (iOS) and lowers music instead of stopping it.
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "duckOthers" });
    const p = getPlayer();
    await p.seekTo(0);
    p.play();
  } catch (error) {
    console.warn("Ride request sound failed", error);
  }
}

/** Stops sound and vibration. Pass a ride id to stop only if that ride is the one ringing. */
export function stopRideAlert(rideId?: string | null) {
  if (rideId && activeRideId && String(rideId) !== activeRideId) return;
  activeRideId = null;
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = null;
  Vibration.cancel();
  try { player?.pause(); } catch { /* player already released */ }
}

export const isRideRequestEvent = (event: unknown) => event === "rideRequest" || event === "rideRequestTest";
export const rideAlertSupported = Platform.OS !== "web";
