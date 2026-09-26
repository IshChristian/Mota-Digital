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
import { RideMap } from "@/components/RideMap";
import {
  DriverCard,
  DriverHeader,
  DriverScreen,
  EmptyState,
  Metric,
  StatusPill,
} from "@/components/driver/DriverUI";

function coordinate(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function DriverRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
    .map((item: any) => ({
      id: String(item._id ?? item.id),
      latitude: coordinate(item.pickup?.latitude ?? item.pickup?.lat),
      longitude: coordinate(item.pickup?.longitude ?? item.pickup?.lng),
    }))
    .filter(
      (item: any) =>
        item.latitude !== undefined && item.longitude !== undefined,
    );
  const mapCenter = requestPoints[0] || {
    latitude: -1.9536,
    longitude: 30.0606,
  };

  return (
    <DriverScreen>
      <FlatList
        data={requests}
        keyExtractor={(item: any, index) =>
          String(item._id ?? item.id ?? `request-${index}`)
        }
        contentContainerStyle={styles.content}
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
              title="Nearby requests"
              subtitle="Live passenger requests close to your current location."
              action={<StatusPill label="Live" tone="success" />}
            />
            {requestPoints.length ? (
              <DriverCard style={styles.mapCard}>
                <View style={styles.map}>
                  <RideMap
                    center={mapCenter as any}
                    nearbyDrivers={requestPoints as any}
                  />
                </View>
                <View style={styles.mapCaption}>
                  <Feather name="info" size={16} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.mapCaptionText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Tap a request below to review the full route before
                    accepting.
                  </Text>
                </View>
              </DriverCard>
            ) : null}
            {query.isError ? (
              <DriverCard>
                <Text style={[styles.errorTitle, { color: colors.error }]}>
                  Requests unavailable
                </Text>
                <Text
                  style={[styles.errorCopy, { color: colors.textSecondary }]}
                >
                  We could not refresh nearby rides. Pull down to try again.
                </Text>
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
              title="No requests nearby"
              message="Stay online and keep location enabled. New requests will appear automatically."
            />
          )
        }
        renderItem={({ item }: any) => {
          const pickup =
            item.pickup?.name || item.pickup?.address || "Pickup location";
          const destination =
            item.destination?.name ||
            item.destination?.address ||
            "Destination";
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Open ride request from ${pickup}`}
              activeOpacity={0.82}
              onPress={() =>
                router.push({
                  pathname: "/ride-request/[id]",
                  params: { id: item._id ?? item.id },
                } as any)
              }
            >
              <DriverCard style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <StatusPill label="New request" tone="warning" />
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
                      >
                        PICKUP
                      </Text>
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
                      >
                        DESTINATION
                      </Text>
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
                    label="Distance"
                    value={`${item.estimatedDistanceKm ?? "—"} km`}
                    icon="navigation"
                  />
                  <Metric
                    label="Est. time"
                    value={`${item.estimatedDurationMin ?? "—"} min`}
                    icon="clock"
                  />
                  <Metric
                    label="Passengers"
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
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 118,
    gap: 12,
  },
  headerContent: { gap: 18, marginBottom: 14 },
  mapCard: { padding: 8 },
  map: { height: 250, overflow: "hidden", borderRadius: 16 },
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
