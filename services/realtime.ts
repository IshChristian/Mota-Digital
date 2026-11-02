import EventSource from "react-native-sse";
import { API_BASE_URL } from "./api";

type Handler = (data: any) => void;
type Status = "connected" | "connecting" | "offline";

// Events the server sends on /realtime/events.
export type RealtimeEvent =
  | "ride_request" | "ride_request_closed" | "rideUpdate" | "rideCompleted" | "driverLocation"
  | "counterOffer" | "chatMessage" | "paymentUpdate" | "notification" | "walletUpdate" | "safetyAlert" | "rideAssigned";

const EVENTS: RealtimeEvent[] = ["ride_request", "ride_request_closed", "rideUpdate", "rideCompleted", "driverLocation", "counterOffer", "chatMessage", "paymentUpdate", "notification", "walletUpdate", "safetyAlert", "rideAssigned"];

/**
 * A single Server-Sent Events connection shared by every screen. Screens
 * subscribe to named events; when the stream is down they fall back to slower
 * polling (see `status`).
 */
class RealtimeClient {
  private source: EventSource<string> | null = null;
  private token: string | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private statusListeners = new Set<(s: Status) => void>();
  status: Status = "offline";

  connect(token: string) {
    if (this.source && this.token === token) return;
    this.disconnect();
    this.token = token;
    this.setStatus("connecting");
    const es = new EventSource<string>(`${API_BASE_URL}/realtime/events`, {
      headers: { Authorization: `Bearer ${token}` },
      pollingInterval: 5000, // reconnect delay after a drop
    });
    es.addEventListener("open", () => this.setStatus("connected"));
    es.addEventListener("error", () => this.setStatus("connecting"));
    es.addEventListener("close", () => this.setStatus("offline"));
    for (const name of EVENTS) {
      es.addEventListener(name as any, (event: any) => {
        if (!event?.data) return;
        let payload: unknown;
        try { payload = JSON.parse(event.data); } catch { return; }
        this.handlers.get(name)?.forEach((h) => { try { h(payload); } catch (e) { console.warn(`realtime ${name} handler`, e); } });
      });
    }
    this.source = es;
  }

  disconnect() {
    this.source?.removeAllEventListeners();
    this.source?.close();
    this.source = null;
    this.token = null;
    this.setStatus("offline");
  }

  on(event: RealtimeEvent, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => { this.handlers.get(event)?.delete(handler); };
  }

  onStatus(listener: (s: Status) => void) {
    this.statusListeners.add(listener);
    return () => { this.statusListeners.delete(listener); };
  }

  private setStatus(s: Status) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }
}

export const realtime = new RealtimeClient();
