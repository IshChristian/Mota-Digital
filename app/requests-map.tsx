import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapCanvas } from "@/components/passenger/ride/MapCanvas";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { ridesApi } from "@/services/api";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { useRoadRoute } from "@/hooks/useRoadRoute";
import { useWideLayout } from "@/hooks/useWideLayout";
import { useRealtimeEvent } from "@/hooks/useRealtime";
import { haversineKm } from "@/utils/geo";
import { placeName, requestFare, requestId, toPoint } from "@/components/driver/requestUtils";

const KIGALI = { latitude: -1.9536, longitude: 30.0606 };

/**
 * Full-screen live map of every passenger waiting for this driver: each
 * request sits where the passenger is standing. Tap one to see its trip, then
 * open it to accept.
 */
export default function RequestsMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const t = useT();
  const s = styles(colors);
  const { wide, panelWidth } = useWideLayout();
  const params = useLocalSearchParams<{ id?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(params.id ? String(params.id) : null);
  const [recenter, setRecenter] = useState(0);
  const { position, issue, retry } = useLiveLocation();
  const me = position ? { latitude: position.latitude, longitude: position.longitude } : null;

  const query = useQuery({
    queryKey: ["driver-ride-requests"],
    queryFn: async () => {
      const response = await ridesApi.getDriverRequests();
      const payload = response.data?.data ?? response.data?.requests ?? response.data;
      return Array.isArray(payload) ? payload : [];
    },
    refetchInterval: 5000,
  });
  // New and closed offers update the map at once instead of waiting for the next poll.
  useRealtimeEvent("ride_request", () => void query.refetch());
  useRealtimeEvent("ride_request_closed", () => void query.refetch());

  const requests = useMemo(() => (query.data ?? []).filter((item: any) => toPoint(item.pickup)), [query.data]);
  const selected = requests.find((item: any) => requestId(item) === selectedId) ?? null;
  useEffect(() => { if (selectedId && query.isFetched && !selected) setSelectedId(null); }, [selectedId, selected, query.isFetched]);

  const pickup = selected ? toPoint(selected.pickup) : undefined;
  const destination = selected ? toPoint(selected.destination) : undefined;
  const trip = useRoadRoute(pickup, destination, 1);
  const points = requests.map((item: any) => ({ ...toPoint(item.pickup)!, id: requestId(item), label: `${requestFare(item).toLocaleString()} RWF`, selected: requestId(item) === selectedId }));
  const padding = wide ? { top: 90, left: panelWidth + 60, right: 60, bottom: 60 } : { top: insets.top + 80, left: 40, right: 40, bottom: selected ? 300 : 160 };
  const fitKey = selected ? `sel:${selectedId}:${recenter}` : `all:${requests.length}:${me ? 1 : 0}:${recenter}`;

  const card = selected ? (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.fare}>{requestFare(selected).toLocaleString()} RWF</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("live.close")} onPress={() => setSelectedId(null)} style={s.close}>
          <Feather name="x" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={s.routeRow}><View style={[s.dot, { backgroundColor: "#16a34a" }]} /><Text style={s.place} numberOfLines={1}>{placeName(selected.pickup, t("drive.pickup_location"))}</Text></View>
      <View style={s.routeRow}><View style={[s.dot, { backgroundColor: "#E63946" }]} /><Text style={s.place} numberOfLines={1}>{placeName(selected.destination, t("drive.destination"))}</Text></View>
      <Text style={s.meta}>
        {me && pickup ? t("live.away_from_you", { km: haversineKm(me, pickup).toFixed(1) }) : ""}
        {selected.estimatedDistanceKm || trip ? `${me && pickup ? " · " : ""}${t("live.trip_distance", { km: Number(selected.estimatedDistanceKm ?? trip?.distanceKm ?? 0).toFixed(1) })}` : ""}
        {selected.passengers > 1 ? ` · ${selected.passengers} ${t("drive.passengers").toLowerCase()}` : ""}
      </Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: "/ride-request/[id]", params: { id: requestId(selected) } } as any)} style={s.primary}>
        <Text style={s.primaryText}>{t("live.review_request")}</Text>
        <Feather name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  ) : null;

  const list = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, padding: 16 }}>
      {query.isLoading ? <ActivityIndicator color={colors.primary} style={{ padding: 24 }} /> : null}
      {!query.isLoading && !requests.length ? <Text style={s.empty}>{t("live.no_requests_map")}</Text> : null}
      {requests.map((item: any) => {
        const id = requestId(item);
        const from = toPoint(item.pickup)!;
        return (
          <TouchableOpacity key={id} accessibilityRole="button" onPress={() => setSelectedId(id)} style={[s.row, id === selectedId && { borderColor: colors.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.place} numberOfLines={1}>{placeName(item.pickup, t("drive.pickup_location"))}</Text>
              <Text style={s.meta} numberOfLines={1}>→ {placeName(item.destination, t("drive.destination"))}{me ? ` · ${t("live.away_from_you", { km: haversineKm(me, from).toFixed(1) })}` : ""}</Text>
            </View>
            <Text style={s.rowFare}>{requestFare(item).toLocaleString()}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={s.container}>
      <MapCanvas center={me ?? pickup ?? KIGALI} me={me} points={points} pickup={pickup ? { ...pickup, label: t("live.pickup") } : null}
        destination={destination ? { ...destination, label: t("live.destination") } : null} route={trip?.points ?? []}
        onMarkerPress={(id) => setSelectedId(id)} onPress={() => setSelectedId(null)} fitKey={fitKey} padding={padding} zoomControls={wide} />

      {wide ? (
        <View style={[s.sidePanel, { width: panelWidth }]}>
          <View style={s.panelHeader}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("drive.back")} onPress={() => router.canGoBack() ? router.back() : router.replace("/(driver)/requests" as any)} style={s.roundFlat}>
              <Feather name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{t("live.requests_map_title")}</Text>
              <Text style={s.meta}>{t("live.requests_map_sub")}</Text>
            </View>
          </View>
          {card ? <View style={{ paddingHorizontal: 16 }}>{card}</View> : null}
          {list}
        </View>
      ) : (
        <>
          <View style={[s.topBar, { top: insets.top + 10 }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("drive.back")} onPress={() => router.canGoBack() ? router.back() : router.replace("/(driver)/requests" as any)} style={s.round}>
              <Feather name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={s.titleChip}>
              <Text style={s.titleChipText} numberOfLines={1}>{t("live.requests_map_title")} · {requests.length}</Text>
            </View>
          </View>
          <View style={[s.bottom, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
            <View style={{ alignItems: "flex-end" }}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("live.locate_me")} onPress={() => { if (!me) retry(); setRecenter((n) => n + 1); }} style={s.round}>
                <Feather name="crosshair" size={20} color={me ? colors.primary : colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {card ?? (
              <View style={s.hint}>
                <Feather name="info" size={16} color={colors.textSecondary} />
                <Text style={[s.meta, { flex: 1 }]}>{requests.length ? t("live.requests_map_sub") : t("live.no_requests_map")}</Text>
              </View>
            )}
          </View>
        </>
      )}
      {issue ? (
        <View style={[s.banner, wide ? { top: 16, right: 16, width: 360 } : { top: insets.top + 64, left: 16, right: 16 }]}>
          <Feather name="alert-triangle" size={15} color="#fff" />
          <Text style={s.bannerText}>{t(issue === "denied" ? "live.location_denied" : issue === "insecure" ? "live.location_insecure" : "live.location_off")}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  topBar: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.backgroundCard, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  roundFlat: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.backgroundElevated, alignItems: "center", justifyContent: "center" },
  titleChip: { flexShrink: 1, backgroundColor: c.backgroundCard, borderRadius: 23, paddingHorizontal: 16, height: 46, justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  titleChipText: { color: c.textPrimary, fontFamily: "Inter_700Bold", fontSize: 14 },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 0, gap: 12, maxWidth: 560, marginHorizontal: "auto" },
  hint: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.backgroundCard, borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  card: { backgroundColor: c.backgroundCard, borderRadius: 20, padding: 16, gap: 10, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: c.border },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.backgroundElevated },
  fare: { color: c.success, fontFamily: "Inter_700Bold", fontSize: 22 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  place: { flex: 1, color: c.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  meta: { color: c.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  primary: { marginTop: 4, height: 50, borderRadius: 16, backgroundColor: c.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  sidePanel: { position: "absolute", left: 16, top: 16, bottom: 16, backgroundColor: c.backgroundCard, borderRadius: 24, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, elevation: 12 },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  title: { color: c.textPrimary, fontFamily: "Inter_700Bold", fontSize: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.background },
  rowFare: { color: c.textPrimary, fontFamily: "Inter_700Bold", fontSize: 15 },
  empty: { color: c.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", padding: 24, lineHeight: 19 },
  banner: { position: "absolute", backgroundColor: "#B45309", borderRadius: 12, padding: 10, flexDirection: "row", gap: 8, alignItems: "center" },
  bannerText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12, flex: 1 },
});
