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

export default function RidesScreen() {
  const t = useT();
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<"today" | "history">("today");

  const s = styles(colors, isDark);

  const { data, refetch, isLoading, isFetching } = useQuery({
    queryKey: ["rides", tab],
    queryFn: async () => {
      const res = await driverApi.getRides(1);
      return res.data?.rides || [];
    },
  });

  const renderRide = ({ item }: { item: any }) => (
    <View style={s.rideCard}>
      <View style={s.rideHeader}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{item.paymentMethod || "CASH"}</Text>
        </View>
        <Text style={s.rideDate}>
          {new Date(item.createdAt || Date.now()).toLocaleDateString()}
        </Text>
      </View>

      <View style={s.locations}>
        <View style={s.locationItem}>
          <Feather name="map-pin" size={16} color={colors.primary} />
          <Text style={s.locationText} numberOfLines={1}>
            {item.pickupLocation}
          </Text>
        </View>
        <View style={s.connector} />
        <View style={s.locationItem}>
          <Feather name="navigation" size={16} color={colors.success} />
          <Text style={s.locationText} numberOfLines={1}>
            {item.dropoffLocation}
          </Text>
        </View>
      </View>

      <View style={s.rideFooter}>
        <Text style={s.distance}>{item.distance || 0} km</Text>
        <Text style={s.fare}>{(item.fare || 0).toLocaleString()} RWF</Text>
      </View>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>{t("rides")}</Text>
        <TouchableOpacity
          style={s.addButton}
          onPress={() => router.push("/log-ride")}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={s.addButtonText}>{t("log_ride")}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === "today" && s.activeTab]}
          onPress={() => setTab("today")}
        >
          <Text style={[s.tabText, { color: tab === "today" ? colors.textPrimary : colors.textSecondary }]}>
            {t("today")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === "history" && s.activeTab]}
          onPress={() => setTab("history")}
        >
          <Text style={[s.tabText, { color: tab === "history" ? colors.textPrimary : colors.textSecondary }]}>
            {t("history")}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderRide}
          contentContainerStyle={s.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Feather name="map" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={s.emptyTitle}>No rides found</Text>
              <Text style={s.emptyText}>
                You haven't logged any rides {tab === "today" ? "today" : "yet"}.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.textPrimary,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
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
      borderBottomColor: colors.border,
    },
    tab: {
      paddingVertical: 12,
      marginRight: 24,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    activeTab: {
      borderBottomColor: colors.primary,
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
      backgroundColor: colors.backgroundCard,
      borderColor: colors.border,
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
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
    },
    badgeText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 1,
      color: colors.textPrimary,
    },
    rideDate: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
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
      color: colors.textPrimary,
    },
    connector: {
      width: 2,
      height: 16,
      marginLeft: 7,
      marginVertical: 4,
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    },
    rideFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)",
    },
    distance: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    fare: {
      color: colors.primary,
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
      color: colors.textPrimary,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
  });
