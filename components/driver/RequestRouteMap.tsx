import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { MapCanvas } from "@/components/passenger/ride/MapCanvas";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { useRoadRoute } from "@/hooks/useRoadRoute";
import { ridesApi } from "@/services/api";
import { haversineKm } from "@/utils/geo";
import { toPoint, type Point } from "@/components/driver/requestUtils";

type Props = { rideId?: string; pickup?: any; destination?: any; height?: number | "100%"; zoomControls?: boolean };

/**
 * Where the passenger is standing (pickup), where they're going, the road route
 * between them and the driver's own position — shown before accepting.
 * Fetches the ride when the alert didn't carry coordinates (older servers).
 */
export function RequestRouteMap({ rideId, pickup, destination, height = 220, zoomControls }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const [fetched, setFetched] = useState<{ pickup?: Point; destination?: Point } | null>(null);
  const from = toPoint(pickup) ?? fetched?.pickup;
  const to = toPoint(destination) ?? fetched?.destination;
  useEffect(() => {
    setFetched(null);
    if (!rideId || (toPoint(pickup) && toPoint(destination))) return;
    let active = true;
    ridesApi.getRideDetails(rideId).then((res) => {
      const ride = res.data?.data?.ride ?? res.data?.ride ?? res.data;
      if (active) setFetched({ pickup: toPoint(ride?.pickup), destination: toPoint(ride?.destination) });
    }).catch(() => {});
    return () => { active = false; };
  }, [rideId]);
  const { position } = useLiveLocation();
  const me = position ? { latitude: position.latitude, longitude: position.longitude } : null;
  const trip = useRoadRoute(from, to, 1);
  const kmToPickup = me && from ? haversineKm(me, from) : null;

  if (!from) {
    return <View style={[styles.box, { height: height as any, backgroundColor: colors.backgroundElevated, alignItems: "center", justifyContent: "center" }]}><Feather name="map" size={22} color={colors.textTertiary} /></View>;
  }
  return (
    <View style={[styles.box, { height: height as any }]}>
      <MapCanvas fill={false} center={from} me={me} pickup={{ ...from, label: t("live.pickup") }} destination={to ? { ...to, label: t("live.destination") } : null}
        route={trip?.points ?? []} fitKey={`${from.latitude},${from.longitude}:${to ? 1 : 0}:${me ? 1 : 0}`} padding={{ top: 50, bottom: 40, left: 30, right: 30 }} zoomControls={zoomControls} />
      <View pointerEvents="none" style={[styles.legend, { backgroundColor: colors.backgroundCard }]}>
        <View style={[styles.dot, { backgroundColor: "#2563eb" }]} /><Text style={[styles.legendText, { color: colors.textPrimary }]}>{t("live.you")}</Text>
        <View style={[styles.dot, { backgroundColor: "#16a34a" }]} /><Text style={[styles.legendText, { color: colors.textPrimary }]}>{t("live.pickup")}</Text>
        {to ? <><View style={[styles.dot, { backgroundColor: "#E63946" }]} /><Text style={[styles.legendText, { color: colors.textPrimary }]}>{t("live.destination")}</Text></> : null}
        {kmToPickup != null ? <Text style={[styles.legendText, { color: colors.textSecondary }]}>· {t("live.away_from_you", { km: kmToPickup.toFixed(1) })}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 18, overflow: "hidden" },
  legend: { position: "absolute", left: 8, top: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, maxWidth: "94%" },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginRight: 4 },
});
