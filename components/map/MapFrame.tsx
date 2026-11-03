import { useCallback, useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import type { MapMessage } from "@/components/map/types";

type Props = { html: string; data: unknown; onMessage: (message: MapMessage) => void; onLoadError?: () => void; sameOrigin?: boolean };

/** Native: the map page in a WebView. (MapFrame.web.tsx is the browser version.) */
export function MapFrame({ html, data, onMessage, onLoadError }: Props) {
  const webView = useRef<WebView>(null);
  const ready = useRef(false);
  const payload = JSON.stringify({ type: "update", data });
  const sendUpdate = useCallback(() => webView.current?.postMessage(payload), [payload]);
  useEffect(() => { if (ready.current) sendUpdate(); }, [sendUpdate]);
  useEffect(() => { ready.current = false; }, [html]);
  return (
    <WebView
      ref={webView}
      source={{ html }}
      style={styles.map}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (!message || typeof message.type !== "string") return;
          if (message.type === "ready") { ready.current = true; sendUpdate(); }
          onMessage(message);
        } catch { /* Ignore unrelated messages. */ }
      }}
      onError={() => onLoadError?.()}
    />
  );
}

const styles = StyleSheet.create({ map: { flex: 1, backgroundColor: "#e5e7eb" } });
