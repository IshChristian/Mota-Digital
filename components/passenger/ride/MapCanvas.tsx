import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { OpenStreetMapView } from "@/components/OpenStreetMapView";
import { GoogleMapWebView } from "@/components/GoogleMapWebView";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { useMapPreference } from "@/context/MapPreferenceContext";
import type { Coordinate, LiveMapProps } from "@/components/map/types";

type Props = Omit<LiveMapProps, "onReady" | "onError" | "onCoordinatePress"> & {
  onPress?: (p: Coordinate) => void;
  /** Fill the parent (default) or take the parent's flex size. */
  fill?: boolean;
};

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const LOAD_TIMEOUT_MS = 12_000;

/** One live map. Starts with the user's chosen provider (Google by default); if it fails or never loads, it quietly switches to the other. */
export function MapCanvas({ onPress, fill = true, ...props }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const [ready, setReady] = useState(false);
  const { mapProvider } = useMapPreference();
  const [provider, setProvider] = useState<"osm" | "google">(mapProvider === "google" && !GOOGLE_KEY ? "osm" : mapProvider);
  useEffect(() => { setReady(false); setProvider(mapProvider === "google" && !GOOGLE_KEY ? "osm" : mapProvider); }, [mapProvider]);
  const [notice, setNotice] = useState("");

  const fallback = () => {
    const next = provider === "osm" ? "google" : "osm";
    if (next === "google" && !GOOGLE_KEY) return;
    setReady(false);
    setProvider(next);
    setNotice(t("trip.map_fallback"));
  };

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(fallback, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [provider, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const mapProps: LiveMapProps = { ...props, onCoordinatePress: onPress, onReady: () => setReady(true) };
  return (
    <View style={fill ? StyleSheet.absoluteFill : styles.flex}>
      {provider === "osm" ? <OpenStreetMapView {...mapProps} /> : <GoogleMapWebView apiKey={GOOGLE_KEY} {...mapProps} onError={fallback} />}
      {!ready ? <View pointerEvents="none" style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View> : null}
      {notice ? <View pointerEvents="none" style={[styles.notice, { backgroundColor: colors.backgroundCard }]}><Text style={{ color: colors.textPrimary, fontSize: 12 }}>{notice}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, overflow: "hidden" },
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", opacity: 0.6 },
  notice: { position: "absolute", alignSelf: "center", top: "45%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
});
