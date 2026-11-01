import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { OpenStreetMapView } from "@/components/OpenStreetMapView";
import { GoogleMapWebView } from "@/components/GoogleMapWebView";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { useMapPreference } from "@/context/MapPreferenceContext";

type Point = { latitude: number; longitude: number };
type Props = { center: Point; destination?: Point | null; route?: Point[]; drivers?: Array<Point & { label?: string }>; onPress?: (p: Point) => void };

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const LOAD_TIMEOUT_MS = 12_000;

/** One map. Starts with the user's chosen provider (Google by default); if it fails or never loads, it quietly switches to the other. */
export function MapCanvas({ center, destination, route = [], drivers = [], onPress }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const [ready, setReady] = useState(false);
  const { mapProvider } = useMapPreference();
  const [provider, setProvider] = useState<"osm" | "google">(mapProvider);
  useEffect(() => { setReady(false); setProvider(mapProvider); }, [mapProvider]);
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

  return (
    <View style={StyleSheet.absoluteFill}>
      {provider === "osm" ? (
        <OpenStreetMapView center={center} destination={destination} route={route} drivers={drivers} onCoordinatePress={onPress} onReady={() => setReady(true)} />
      ) : (
        <GoogleMapWebView apiKey={GOOGLE_KEY} center={center} destination={destination} route={route} drivers={drivers} onCoordinatePress={onPress} onReady={() => setReady(true)} onError={fallback} />
      )}
      {!ready ? <View pointerEvents="none" style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View> : null}
      {notice ? <View pointerEvents="none" style={[styles.notice, { backgroundColor: colors.backgroundCard }]}><Text style={{ color: colors.textPrimary, fontSize: 12 }}>{notice}</Text></View> : null}
      {provider === "osm" ? <Text style={styles.attribution}>© OpenStreetMap contributors</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", opacity: 0.6 },
  notice: { position: "absolute", alignSelf: "center", top: "45%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  attribution: { position: "absolute", right: 6, top: 4, fontSize: 9, color: "#374151", backgroundColor: "rgba(255,255,255,0.7)", paddingHorizontal: 4 },
});
