import React, { useState } from "react";
import {
  StyleSheet, Text, View, RefreshControl, TouchableOpacity, FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { ridesApi } from "@/services/api";
import { useRouter } from "expo-router";
import { PassengerHeader } from "@/components/passenger/PassengerUI";

type RideHistoryItem = {
  id?: string;
  _id?: string;
  pickup: string | { name?: string; address?: string };
  destination: string | { name?: string; address?: string };
  fare: number;
  status?: string;
  rideStatus?: string;
  driverName?: string;
  driverId?: { firstName?: string; lastName?: string };
  createdAt: string;
  rating?: number;
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#10B981",
  cancelled: "#EF4444",
  in_progress: "#F59E0B",
};

export default function PassengerRidesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "cancelled">("all");

  const { data: rides = [], isLoading, refetch } = useQuery({
    queryKey: ["passenger_rides"],
    queryFn: async () => {
      try {
        const res = await ridesApi.getMyRides();
        return res.data?.rides || res.data?.data?.rides || [];
      } catch {
        return [];
      }
    },
  });

  const filteredRides = activeTab === "all"
    ? rides
    : rides.filter((r: RideHistoryItem) => (r.rideStatus || r.status) === activeTab);

  const s = styles(colors, isDark);

  const renderRide = ({ item }: { item: RideHistoryItem }) => {
    const status = item.rideStatus || item.status || "requested";
    const statusColor = STATUS_COLORS[status] || "#64748B";
    const pickup = typeof item.pickup === "string" ? item.pickup : item.pickup?.name || item.pickup?.address || "Pickup location";
    const destination = typeof item.destination === "string" ? item.destination : item.destination?.name || item.destination?.address || "Destination";
    const driverName = item.driverName || [item.driverId?.firstName, item.driverId?.lastName].filter(Boolean).join(" ") || "Not assigned";
    return <TouchableOpacity style={s.rideCard} onPress={() => router.push({ pathname: "/(passenger)/ride-details/[id]", params: { id: item._id || item.id || "" } } as any)}>
      <View style={s.rideHeader}>
        <View style={[s.statusBadge, { backgroundColor: `${statusColor}20` }]}> 
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusText, { color: statusColor }]}> 
            {status.replaceAll("_", " ").toUpperCase()}
          </Text>
        </View>
        <Text style={s.rideDate}>
          {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Text>
      </View>

      <View style={s.routeContainer}>
        <View style={s.routeIcons}>
          <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
          <View style={s.routeLine} />
          <View style={[s.routeDot, { backgroundColor: "#10B981" }]} />
        </View>
        <View style={s.routeTexts}>
          <Text style={s.routeText} numberOfLines={1}>{pickup}</Text>
          <Text style={[s.routeText, { marginTop: 16 }]} numberOfLines={1}>{destination}</Text>
        </View>
      </View>

      <View style={s.rideFooter}>
        <View style={s.driverInfo}>
          <Feather name="user" size={14} color={colors.textSecondary} />
          <Text style={s.driverText}>{driverName}</Text>
        </View>
        <Text style={s.fareText}>{item.fare.toLocaleString()} RWF</Text>
      </View>

      {item.rating && (
        <View style={s.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Feather
              key={star}
              name="star"
              size={14}
              color={star <= item.rating! ? "#FFD700" : colors.border}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>;
  };

  const tabs = [
    { key: "all" as const, label: "All" },
    { key: "completed" as const, label: "Completed" },
    { key: "cancelled" as const, label: "Cancelled" },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top + 16 }]}>
      <View style={{ paddingHorizontal: 16 }}><PassengerHeader title="My rides" subtitle="Track requests, completed trips, and cancellations" /></View>

      <View style={s.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredRides}
        keyExtractor={(item: RideHistoryItem, index) => item._id || item.id || `ride-${index}`}
        renderItem={renderRide}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name="map" size={48} color={colors.border} />
            <Text style={s.emptyTitle}>No rides yet</Text>
            <Text style={s.emptySubtitle}>Your ride history will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.textPrimary, paddingHorizontal: 16, marginBottom: 16 },
  tabBar: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },

  rideCard: { backgroundColor: colors.backgroundCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  rideHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rideDate: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary },

  routeContainer: { flexDirection: "row", marginBottom: 12 },
  routeIcons: { alignItems: "center", marginRight: 12, paddingTop: 4 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, height: 20, backgroundColor: colors.border },
  routeTexts: { flex: 1 },
  routeText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.textPrimary },

  rideFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  driverInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  driverText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary },
  fareText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.textPrimary },

  ratingRow: { flexDirection: "row", gap: 4, marginTop: 8 },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginTop: 4 },
});
