import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter as useExpoRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { driverApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import Colors from "@/constants/colors";

export default function DashboardScreen() {
  const { user } = useAuth();
  const t = useT();
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await driverApi.getDashboard();
      return res.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("good_morning");
    if (hour < 18) return t("good_afternoon");
    return t("good_evening");
  };

  const dashboardData = data || {
    tier: user?.tier || "bronze",
    multiplier: 1.0,
    ridesToday: 0,
    target: 20,
    ridesMonth: 0,
    streak: 0,
    longestStreak: 0,
    wallet: 0,
    referrals: 0,
  };

  const tierColor = (Colors.tier as any)[dashboardData.tier.toLowerCase()] || Colors.tier.bronze;

  return (
    <ScrollView
      style={[styles.container]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          tintColor={Colors.primary} 
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{user?.firstName || "Driver"}!</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => router.push("/card")}
          >
            <Feather name="credit-card" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push("/notifications")}
          >
            <View style={styles.badge} />
            <Feather name="bell" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tier Badge */}
      <View style={[styles.tierCard, { borderColor: tierColor }]}>
        <Feather name="award" size={28} color={tierColor} />
        <View style={styles.tierInfo}>
          <Text style={[styles.tierTitle, { color: tierColor }]}>
            {dashboardData.tier.toUpperCase()} {t("tier")}
          </Text>
          <Text style={styles.tierSubtitle}>
            {dashboardData.multiplier}x Earnings Multiplier
          </Text>
        </View>
      </View>

      {/* Wallet Balance */}
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>{t("balance")}</Text>
        <Text style={styles.walletAmount}>
          {dashboardData.wallet.toLocaleString()} RWF
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/log-ride")}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(230, 57, 70, 0.2)' }]}>
            <Feather name="plus-circle" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.actionText}>{t("log_ride")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/(tabs)/wallet")}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <Feather name="arrow-down-circle" size={24} color={Colors.success} />
          </View>
          <Text style={styles.actionText}>{t("cash_in")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/leaderboard")}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(244, 162, 97, 0.2)' }]}>
            <Feather name="bar-chart-2" size={24} color={Colors.accent} />
          </View>
          <Text style={styles.actionText}>{t("leaderboard")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/loans")}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(29, 53, 87, 0.8)' }]}>
            <Feather name="briefcase" size={24} color="#81c3d7" />
          </View>
          <Text style={styles.actionText}>{t("loans")}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Feather name="target" size={20} color={Colors.primary} style={styles.statIcon} />
          <Text style={styles.statValue}>
            {dashboardData.ridesToday} <Text style={styles.statSubValue}>/ {dashboardData.target}</Text>
          </Text>
          <Text style={styles.statLabel}>{t("rides_today")}</Text>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min((dashboardData.ridesToday / dashboardData.target) * 100, 100)}%` }
              ]} 
            />
          </View>
        </View>

        <View style={styles.statCard}>
          <Feather name="zap" size={20} color={Colors.accent} style={styles.statIcon} />
          <Text style={styles.statValue}>{dashboardData.streak} <Text style={styles.statSubValue}>days</Text></Text>
          <Text style={styles.statLabel}>{t("streak")}</Text>
        </View>

        <View style={styles.statCard}>
          <Feather name="calendar" size={20} color={Colors.success} style={styles.statIcon} />
          <Text style={styles.statValue}>{dashboardData.ridesMonth}</Text>
          <Text style={styles.statLabel}>{t("monthly_rides")}</Text>
        </View>

        <View style={styles.statCard}>
          <Feather name="users" size={20} color="#a8dadc" style={styles.statIcon} />
          <Text style={styles.statValue}>{dashboardData.referrals}</Text>
          <Text style={styles.statLabel}>{t("referrals")}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  name: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  tierInfo: {
    marginLeft: 16,
  },
  tierTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  tierSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  walletCard: {
    backgroundColor: Colors.secondary,
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  walletLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  walletAmount: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionBtn: {
    alignItems: "center",
    width: "23%",
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  statSubValue: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginTop: 12,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});
