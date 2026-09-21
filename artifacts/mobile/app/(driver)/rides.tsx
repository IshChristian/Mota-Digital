import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { driverApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import {
  DriverButton,
  DriverCard,
  DriverHeader,
  DriverScreen,
  EmptyState,
  StatusPill,
} from "@/components/driver/DriverUI";

function locationLabel(value: any, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  return value?.name || value?.address || fallback;
}

export default function DriverRidesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"today" | "history">("today");
  const query = useQuery({
    queryKey: ["driver-rides"],
    queryFn: async () => {
      const response = await driverApi.getRides(1);
      const payload =
        response.data?.rides ?? response.data?.data ?? response.data;
      return Array.isArray(payload) ? payload : [];
    },
    retry: 2,
  });

  const rides = useMemo(() => {
    const rows = query.data ?? [];
    if (tab === "history") return rows;
    const today = new Date();
    return rows.filter((ride: any) => {
      const date = new Date(ride.createdAt);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    });
  }, [query.data, tab]);

  return (
    <DriverScreen>
      <FlatList
        data={rides}
        keyExtractor={(item: any, index) =>
          String(item._id ?? item.id ?? `ride-${index}`)
        }
        contentContainerStyle={styles.content}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <DriverHeader
              back
              title="Your rides"
              subtitle="Review completed, cancelled, and active ride activity."
            />
            <View
              style={[
                styles.tabs,
                { backgroundColor: colors.backgroundElevated },
              ]}
            >
              {(["today", "history"] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === value }}
                  onPress={() => setTab(value)}
                  style={[
                    styles.tab,
                    tab === value && { backgroundColor: colors.backgroundCard },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          tab === value
                            ? colors.textPrimary
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {value === "today" ? "Today" : "All history"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {query.isError ? (
              <DriverCard>
                <Text style={[styles.errorTitle, { color: colors.error }]}>
                  Could not load rides
                </Text>
                <Text
                  style={[styles.errorCopy, { color: colors.textSecondary }]}
                >
                  Pull down to retry.
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
              icon="map"
              title={tab === "today" ? "No rides today" : "No ride history"}
              message="Completed and cancelled rides will appear here with route and payment details."
              action={
                <DriverButton
                  label="View nearby requests"
                  icon="radio"
                  onPress={() => router.push("/(driver)/requests")}
                />
              }
            />
          )
        }
        renderItem={({ item }: any) => {
          const status = String(
            item.rideStatus ?? item.status ?? "completed",
          ).replaceAll("_", " ");
          const statusTone =
            status === "completed"
              ? "success"
              : status.includes("cancel")
                ? "danger"
                : "warning";
          return (
            <DriverCard style={styles.card}>
              <View style={styles.cardTop}>
                <StatusPill label={status} tone={statusTone as any} />
                <Text style={[styles.date, { color: colors.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.route}>
                <View style={styles.routeRail}>
                  <View
                    style={[styles.dot, { backgroundColor: colors.primary }]}
                  />
                  <View
                    style={[styles.line, { backgroundColor: colors.border }]}
                  />
                  <View
                    style={[styles.dot, { backgroundColor: colors.success }]}
                  />
                </View>
                <View style={styles.routeCopy}>
                  <Text
                    style={[styles.location, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {locationLabel(
                      item.pickupLocation ?? item.pickup,
                      "Pickup location",
                    )}
                  </Text>
                  <Text
                    style={[styles.location, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {locationLabel(
                      item.dropoffLocation ?? item.destination,
                      "Destination",
                    )}
                  </Text>
                </View>
              </View>
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <View>
                  <Text
                    style={[styles.metaLabel, { color: colors.textSecondary }]}
                  >
                    DISTANCE
                  </Text>
                  <Text
                    style={[styles.metaValue, { color: colors.textPrimary }]}
                  >
                    {Number(item.distance || 0).toFixed(1)} km
                  </Text>
                </View>
                <View style={styles.fareBlock}>
                  <Text
                    style={[styles.metaLabel, { color: colors.textSecondary }]}
                  >
                    FARE
                  </Text>
                  <Text style={[styles.fare, { color: colors.textPrimary }]}>
                    {Number(
                      item.fare || item.offeredFare || 0,
                    ).toLocaleString()}{" "}
                    RWF
                  </Text>
                </View>
              </View>
            </DriverCard>
          );
        }}
      />
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },
  headerContent: { gap: 18, marginBottom: 14 },
  tabs: { flexDirection: "row", borderRadius: 16, padding: 4 },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  card: { gap: 17, marginBottom: 12 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  date: { fontFamily: "Inter_400Regular", fontSize: 12 },
  route: { flexDirection: "row", gap: 13 },
  routeRail: { width: 12, alignItems: "center", paddingVertical: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, flex: 1, minHeight: 36 },
  routeCopy: { flex: 1, gap: 24 },
  location: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 19 },
  footer: {
    borderTopWidth: 1,
    paddingTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaValue: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  fareBlock: { alignItems: "flex-end" },
  fare: { fontFamily: "Inter_700Bold", fontSize: 18 },
  loader: { marginTop: 60 },
  errorTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  errorCopy: { marginTop: 5 },
});
