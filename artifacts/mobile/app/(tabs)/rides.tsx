import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter as useExpoRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { driverApi } from "@/services/api";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import Colors from "@/constants/colors";

export default function RidesScreen() {
  const t = useT();
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<"today" | "history">("today");

  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: ["rides", tab],
    queryFn: async () => {
      const res = await driverApi.getRides(1);
      return res.data?.rides || [];
    },
  });

  const renderRide = ({ item }: { item: any }) => (
    <View style={[styles.rideCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      <View style={styles.rideHeader}>
        <View style={[styles.badge, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)" }]}>
          <Text style={[styles.badgeText, { color: colors.textPrimary }]}>{item.paymentMethod || "CASH"}</Text>
        </View>
        <Text style={[styles.rideDate, { color: colors.textSecondary }]}>
          {new Date(item.createdAt || Date.now()).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.locations}>
        <View style={styles.locationItem}>
          <Feather name="map-pin" size={16} color={Colors.primary} />
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.pickupLocation}
          </Text>
        </View>
        <View style={[styles.connector, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />
        <View style={styles.locationItem}>
          <Feather name="navigation" size={16} color={Colors.success} />
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.dropoffLocation}
          </Text>
        </View>
      </View>

      <View style={[styles.rideFooter, { borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)" }]}>
        <Text style={[styles.distance, { color: colors.textSecondary }]}>{item.distance || 0} km</Text>
        <Text style={styles.fare}>{(item.fare || 0).toLocaleString()} RWF</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t("rides")}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/log-ride")}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>{t("log_ride")}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { borderBottomColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]}>
        <TouchableOpacity
          style={[styles.tab, tab === "today" && styles.activeTab]}
          onPress={() => setTab("today")}
        >
          <Text style={[styles.tabText, { color: tab === "today" ? colors.textPrimary : colors.textSecondary }]}>
            {t("today")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "history" && styles.activeTab]}
          onPress={() => setTab("history")}
        >
          <Text style={[styles.tabText, { color: tab === "history" ? colors.textPrimary : colors.textSecondary }]}>
            {t("history")}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderRide}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="map" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No rides found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                You haven't logged any rides {tab === "today" ? "today" : "yet"}.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  rideCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  rideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  rideDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  locations: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  connector: {
    width: 2,
    height: 16,
    marginLeft: 7,
    marginVertical: 4,
  },
  rideFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
  },
  distance: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  fare: {
    color: Colors.primary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
