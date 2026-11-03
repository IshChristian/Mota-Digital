import { useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";

// The map HTML talks to React Native through window.ReactNativeWebView.postMessage.
// In a browser we load the same HTML in an iframe and route that call to the parent page.
const BRIDGE = "<script>window.ReactNativeWebView={postMessage:function(m){parent.postMessage(m,'*')}};</script>";

type Props = {
  html: string;
  data: unknown;
  onMessage: (message: { type: string; [key: string]: unknown }) => void;
  onLoadError?: () => void;
  /** Google Maps needs same-origin access inside its frame; Leaflet runs fully sandboxed. */
  sameOrigin?: boolean;
};

/** Browser: the map page in a sandboxed iframe. (MapFrame.tsx is the native version.) */
export function MapFrame({ html, data, onMessage, sameOrigin }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const srcDoc = useMemo(() => html.replace("<head>", `<head>${BRIDGE}`), [html]);

  const payload = JSON.stringify({ type: "update", data });
  const sendUpdate = useCallback(() => {
    frame.current?.contentWindow?.postMessage(payload, "*");
  }, [payload]);
  const sendUpdateRef = useRef(sendUpdate);
  sendUpdateRef.current = sendUpdate;

  useEffect(() => { if (ready.current) sendUpdate(); }, [sendUpdate]);

  // A new document means the map must announce "ready" again before it can take updates.
  useEffect(() => { ready.current = false; }, [srcDoc]);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      try {
        const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!message || typeof message.type !== "string") return;
        if (message.type === "ready") {
          ready.current = true;
          sendUpdateRef.current();
        }
        onMessageRef.current(message);
      } catch { /* Ignore unrelated messages. */ }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  return (
    <View style={styles.map}>
      {/* allow-scripts alone keeps the map away from this page's storage (auth token); Google Maps can't run that way. */}
      <iframe ref={frame} srcDoc={srcDoc} sandbox={sameOrigin ? "allow-scripts allow-same-origin" : "allow-scripts"} title="Map" style={{ border: 0, width: "100%", height: "100%", display: "block" }} />
    </View>
  );
}

const styles = StyleSheet.create({ map: { flex: 1, backgroundColor: "#e5e7eb", overflow: "hidden" } });
