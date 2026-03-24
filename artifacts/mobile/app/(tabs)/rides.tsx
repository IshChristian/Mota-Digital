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
import Colors from "@/constants/colors";

export default function RidesScreen() {
  const t = useT();
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"today" | "history">("today");

  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: ["rides", tab],
    queryFn: async () => {
      // In a real app, 'today' might just filter or pass a param. We'll pass page=1.
      const res = await driverApi.getRides(1);
      return res.data?.rides || [];
    },
  });

  const renderRide = ({ item }: { item: any }) => (
    <View style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.paymentMethod || "CASH"}</Text>
        </View>
        <Text style={styles.rideDate}>
          {new Date(item.createdAt || Date.now()).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.locations}>
        <View style={styles.locationItem}>
          <Feather name="map-pin" size={16} color={Colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>{item.pickupLocation}</Text>
        </View>
        <View style={styles.connector} />
        <View style={styles.locationItem}>
          <Feather name="navigation" size={16} color={Colors.success} />
          <Text style={styles.locationText} numberOfLines={1}>{item.dropoffLocation}</Text>
        </View>
      </View>

      <View style={styles.rideFooter}>
        <Text style={styles.distance}>{item.distance || 0} km</Text>
        <Text style={styles.fare}>{(item.fare || 0).toLocaleString()} RWF</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("rides")}</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push("/log-ride")}
        >
          <Feather name="plus" size={20} color={Colors.textPrimary} />
          <Text style={styles.addButtonText}>{t("log_ride")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, tab === "today" && styles.activeTab]}
          onPress={() => setTab("today")}
        >
          <Text style={[styles.tabText, tab === "today" && styles.activeTabText]}>
            {t("today")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, tab === "history" && styles.activeTab]}
          onPress={() => setTab("history")}
        >
          <Text style={[styles.tabText, tab === "history" && styles.activeTabText]}>
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
              <Feather name="map" size={48} color={Colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No rides found</Text>
              <Text style={styles.emptyText}>You haven't logged any rides {tab === 'today' ? 'today' : 'yet'}.</Text>
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
    backgroundColor: Colors.backgroundDark,
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
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
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
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textPrimary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  rideCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  rideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  rideDate: {
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  connector: {
    width: 2,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginLeft: 7,
    marginVertical: 4,
  },
  rideFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  distance: {
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
