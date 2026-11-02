import { useEffect, useRef, useState } from "react";
import { realtime, type RealtimeEvent } from "@/services/realtime";

/** Subscribe to a live server event for the lifetime of the component. */
export function useRealtimeEvent(event: RealtimeEvent, handler: (data: any) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => realtime.on(event, (data) => ref.current(data)), [event]);
}

export function useRealtimeStatus() {
  const [status, setStatus] = useState(realtime.status);
  useEffect(() => realtime.onStatus(setStatus), []);
  return status;
}
