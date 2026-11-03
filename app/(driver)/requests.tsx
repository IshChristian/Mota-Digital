import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { ridesApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapCanvas } from "@/components/passenger/ride/MapCanvas";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { useWideLayout } from "@/hooks/useWideLayout";
import { requestFare, requestId, toPoint } from "@/components/driver/requestUtils";
import {
  DriverCard,
  DriverHeader,
  DriverScreen,
  EmptyState,
  Metric,
  StatusPill,
} from "@/components/driver/DriverUI";

export default function DriverRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { wide } = useWideLayout();
  const { position } = useLiveLocation();
  const me = position ? { latitude: position.latitude, longitude: position.longitude } : null;
  const [manualRefresh, setManualRefresh] = useState(false);
  const query = useQuery({
    queryKey: ["driver-ride-requests"],
    queryFn: async () => {
      const response = await ridesApi.getDriverRequests();
      const payload =
        response.data?.data ?? response.data?.requests ?? response.data;
      return Array.isArray(payload) ? payload : [];
    },
    refetchInterval: 5000,
    retry: 2,
  });

  const requests = query.data ?? [];
  const requestPoints = requests
    .map((item: any) => {
      const pickup = toPoint(item.pickup);
      return pickup ? { ...pickup, id: requestId(item), label: `${requestFare(item).toLocaleString()} RWF` } : null;
    })
    .filter(Boolean) as Array<{ id: string; latitude: number; longitude: number; label: string }>;
  const mapCenter = me || requestPoints[0] || { latitude: -1.9536, longitude: 30.0606 };
  const openRequest = (id: string) => router.push({ pathname: "/ride-request/[id]", params: { id } } as any);
  const openFullMap = (id?: string) => router.push({ pathname: "/requests-map", params: id ? { id } : {} } as any);
  const liveMap = (
    <View style={wide ? styles.wideMap : styles.map}>
      <MapCanvas fill={false} center={mapCenter} me={me} points={requestPoints} onMarkerPress={(id) => openFullMap(id)}
        fitKey={`${requestPoints.map((p) => p.id).join(",")}:${me ? 1 : 0}`} padding={{ top: 40, bottom: 40, left: 40, right: 40 }} zoomControls={wide} />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("live.full_map")} onPress={() => openFullMap()} style={[styles.fullMapBtn, { backgroundColor: colors.backgroundCard }]}>
        <Feather name="maximize-2" size={15} color={colors.textPrimary} />
        <Text style={[styles.fullMapText, { color: colors.textPrimary }]}>{t("live.full_map")}</Text>
      </TouchableOpacity>
    </View>
  );

  const list = (
      <FlatList
        style={{ flex: 1 }}
        data={requests}
        keyExtractor={(item: any, index) =>
          String(item._id ?? item.id ?? `request-${index}`)
        }
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }, wide && styles.contentWide]}
        refreshControl={
          <RefreshControl
            refreshing={manualRefresh}
            onRefresh={async () => { setManualRefresh(true); try { await query.refetch(); } finally { setManualRefresh(false); } }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <DriverHeader
              title={t("drive.nearby_title")}
              subtitle={t("drive.nearby_sub")}
              action={<StatusPill label={t("drive.live")} tone="success" />}
            />
            {!wide ? (
              <DriverCard style={styles.mapCard}>
                {liveMap}
                <View style={styles.mapCaption}>
                  <Feather name="info" size={16} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.mapCaptionText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("live.requests_map_sub")}
                  </Text>
                </View>
              </DriverCard>
            ) : null}
            {query.isError ? (
              <DriverCard>
                <Text style={[styles.errorTitle, { color: colors.error }]}>{t("drive.unavailable_title")}</Text>
                <Text
                  style={[styles.errorCopy, { color: colors.textSecondary }]}
                >{t("drive.unavailable_body")}</Text>
              </DriverCard>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator
              style={styles.loader}
              size="large"
              color={colors.primary}
            />
          ) : (
            <EmptyState
              icon="radio"
              title={t("drive.none_title")}
              message={t("drive.none_body")}
            />
          )
        }
        renderItem={({ item }: any) => {
          const pickup =
            item.pickup?.name || item.pickup?.address || t("drive.pickup_location");
          const destination =
            item.destination?.name ||
            item.destination?.address ||
            t("drive.destination");
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Open ride request from ${pickup}`}
              activeOpacity={0.82}
              onPress={() => openRequest(requestId(item))}
            >
              <DriverCard style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <StatusPill label={t("drive.new_request")} tone="warning" />
                  <Text style={[styles.fare, { color: colors.textPrimary }]}>
                    {Number(
                      item.offeredFare || item.fare || 0,
                    ).toLocaleString()}{" "}
                    RWF
                  </Text>
                </View>
                <View style={styles.route}>
                  <View style={styles.routeRail}>
                    <View
                      style={[
                        styles.routeDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <View
                      style={[
                        styles.routeLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View
                      style={[
                        styles.routeDot,
                        { backgroundColor: colors.success },
                      ]}
                    />
                  </View>
                  <View style={styles.routeCopy}>
                    <View>
                      <Text
                        style={[
                          styles.routeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >{t("drive.pickup").toUpperCase()}</Text>
                      <Text
                        style={[styles.place, { color: colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {pickup}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.routeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >{t("drive.destination").toUpperCase()}</Text>
                      <Text
                        style={[styles.place, { color: colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {destination}
                      </Text>
                    </View>
                  </View>
                </View>
                <View
                  style={[styles.metrics, { borderTopColor: colors.border }]}
                >
                  <Metric
                    label={t("drive.distance")}
                    value={`${item.estimatedDistanceKm ?? "—"} km`}
                    icon="navigation"
                  />
                  <Metric
                    label={t("drive.est_time")}
                    value={`${item.estimatedDurationMin ?? "—"} min`}
                    icon="clock"
                  />
                  <Metric
                    label={t("drive.passengers")}
                    value={String(item.passengers || 1)}
                    icon="users"
                  />
                  <Feather
                    name="chevron-right"
                    size={22}
                    color={colors.textSecondary}
                  />
                </View>
              </DriverCard>
            </TouchableOpacity>
          );
        }}
      />
  );

  return (
    <DriverScreen>
      {wide ? (
        <View style={styles.wideRow}>
          <View style={styles.wideList}>{list}</View>
          <View style={[styles.wideMapCol, { paddingTop: insets.top + 16 }]}>{liveMap}</View>
        </View>
      ) : list}
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    gap: 12,
  },
  headerContent: { gap: 18, marginBottom: 14 },
  mapCard: { padding: 8 },
  map: { height: 250, overflow: "hidden", borderRadius: 16 },
  contentWide: { paddingHorizontal: 24 },
  wideRow: { flex: 1, flexDirection: "row" },
  wideList: { width: 460, maxWidth: "45%" },
  wideMapCol: { flex: 1, paddingRight: 24, paddingBottom: 24 },
  wideMap: { flex: 1, overflow: "hidden", borderRadius: 24 },
  fullMapBtn: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  fullMapText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  mapCaption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  mapCaptionText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  requestCard: { gap: 16, marginBottom: 12 },
  requestTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fare: { fontFamily: "Inter_700Bold", fontSize: 19 },
  route: { flexDirection: "row", gap: 13 },
  routeRail: { width: 12, alignItems: "center", paddingVertical: 5 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, flex: 1, minHeight: 38 },
  routeCopy: { flex: 1, gap: 17 },
  routeLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  place: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 20 },
  metrics: {
    borderTopWidth: 1,
    paddingTop: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loader: { marginTop: 60 },
  errorTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  errorCopy: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
});
