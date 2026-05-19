import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter as useExpoRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { driverApi, algorithmApi, walletApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import Colors from "@/constants/colors";

export default function DashboardScreen() {
  const { user, riderStatus: cachedRiderStatus } = useAuth();
  const t = useT();
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Algorithm Engine — rider status
  const { data: algoData, refetch: refetchAlgo } = useQuery({
    queryKey: ["rider_status"],
    queryFn: async () => {
      const res = await algorithmApi.getRiderStatus();
      return res.data?.data || res.data;
    },
    staleTime: 60000,
  });

  // Algorithm Engine — rider earnings
  const { data: earningsData, refetch: refetchEarnings } = useQuery({
    queryKey: ["rider_earnings"],
    queryFn: async () => {
      const res = await algorithmApi.getRiderEarnings();
      return res.data?.data || res.data;
    },
    staleTime: 60000,
  });

  // Wallet balance
  const { data: balanceData, refetch: refetchBalance } = useQuery({
    queryKey: ["wallet_balance"],
    queryFn: async () => {
      const res = await walletApi.getBalance();
      return res.data;
    },
    staleTime: 30000,
  });

  // Dashboard data (fallback for referrals, etc.)
  const { data: dashData, refetch: refetchDash } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await driverApi.getDashboard();
      return res.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAlgo(), refetchEarnings(), refetchBalance(), refetchDash()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("good_morning");
    if (hour < 18) return t("good_afternoon");
    return t("good_evening");
  };

  // Merge algorithm data with dashboard fallback
  const currentTier = (algoData?.current_tier || dashData?.tier || user?.tier || "bronze").toLowerCase();
  const dailyRides = algoData?.daily_rides ?? dashData?.ridesToday ?? 0;
  const monthlyRides = algoData?.monthly_rides ?? dashData?.ridesMonth ?? 0;
  const streakDays = algoData?.streak_days ?? dashData?.streak ?? 0;
  const dailyEarnings = earningsData?.daily_earnings ?? algoData?.daily_earnings ?? 0;
  const walletBalance = balanceData?.balance ?? dashData?.wallet ?? 0;
  const trophies = algoData?.trophies || [];
  const featuresUnlocked = algoData?.features_unlocked || [];
  const cycleNumber = algoData?.cycle_number ?? 0;
  const tierMultiplier = earningsData?.tier_multiplier ?? dashData?.multiplier ?? 1.0;
  const referrals = dashData?.referrals ?? 0;
  const target = dashData?.target ?? 20;

  const tierColor =
    (Colors.tier as any)[currentTier] || Colors.tier.bronze;

  const s = styles(colors, isDark);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{getGreeting()},</Text>
          <Text style={s.name}>{user?.firstName || "Driver"}!</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity
            style={s.iconButton}
            onPress={() => router.push("/card")}
          >
            <Feather name="credit-card" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconButton}
            onPress={() => router.push("/notifications")}
          >
            <View style={s.badge} />
            <Feather name="bell" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tier Badge */}
      <View style={[s.tierCard, { borderColor: tierColor }]}>
        <Feather name="award" size={28} color={tierColor} />
        <View style={s.tierInfo}>
          <Text style={[s.tierTitle, { color: tierColor }]}>
            {currentTier.toUpperCase()} {t("tier")}
          </Text>
          <Text style={s.tierSubtitle}>
            {tierMultiplier}x Earnings Multiplier
          </Text>
        </View>
        {cycleNumber > 0 && (
          <View style={s.cycleTag}>
            <Text style={s.cycleText}>Cycle {cycleNumber}</Text>
          </View>
        )}
      </View>

      {/* Wallet Balance */}
      <View style={s.walletCard}>
        <View style={s.walletRow}>
          <View>
            <Text style={s.walletLabel}>{t("balance")}</Text>
            <Text style={s.walletAmount}>
              {walletBalance.toLocaleString()} RWF
            </Text>
          </View>
          <View style={s.walletRight}>
            <Text style={s.earningsLabel}>Today's Earnings</Text>
            <Text style={s.earningsAmount}>
              +{dailyEarnings.toLocaleString()} RWF
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={s.quickActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/log-ride")}>
          <View
            style={[
              s.actionIcon,
              { backgroundColor: isDark ? "rgba(230,57,70,0.18)" : "rgba(230,57,70,0.12)" },
            ]}
          >
            <Feather name="plus-circle" size={24} color={colors.primary} />
          </View>
          <Text style={s.actionText}>{t("log_ride")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/send-money")}>
          <View
            style={[
              s.actionIcon,
              { backgroundColor: isDark ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.12)" },
            ]}
          >
            <Feather name="send" size={24} color={colors.success} />
          </View>
          <Text style={s.actionText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/leaderboard")}>
          <View
            style={[
              s.actionIcon,
              { backgroundColor: isDark ? "rgba(244,162,97,0.18)" : "rgba(244,162,97,0.12)" },
            ]}
          >
            <Feather name="bar-chart-2" size={24} color={Colors.accent} />
          </View>
          <Text style={s.actionText}>{t("leaderboard")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/loans")}>
          <View
            style={[
              s.actionIcon,
              { backgroundColor: isDark ? "rgba(29,53,87,0.8)" : "rgba(29,53,87,0.12)" },
            ]}
          >
            <Feather name="briefcase" size={24} color="#81c3d7" />
          </View>
          <Text style={s.actionText}>{t("loans")}</Text>
        </TouchableOpacity>

        {/* Fuel Vouchers — Tier 3+ only */}
        {["gold", "platinum", "gorilla"].includes(currentTier) && (
          <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/fuel-vouchers" as any)}>
            <View
              style={[
                s.actionIcon,
                { backgroundColor: isDark ? "rgba(255,215,0,0.18)" : "rgba(255,215,0,0.12)" },
              ]}
            >
              <Feather name="zap" size={24} color="#FFD700" />
            </View>
            <Text style={s.actionText}>Fuel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        <View style={s.statCard}>
          <Feather name="target" size={20} color={colors.primary} style={s.statIcon} />
          <Text style={s.statValue}>
            {dailyRides}{" "}
            <Text style={s.statSubValue}>/ {target}</Text>
          </Text>
          <Text style={s.statLabel}>{t("rides_today")}</Text>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${Math.min(
                    (dailyRides / target) * 100,
                    100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={s.statCard}>
          <Feather name="zap" size={20} color={Colors.accent} style={s.statIcon} />
          <Text style={s.statValue}>
            {streakDays}{" "}
            <Text style={s.statSubValue}>days</Text>
          </Text>
          <Text style={s.statLabel}>{t("streak")}</Text>
        </View>

        <View style={s.statCard}>
          <Feather name="calendar" size={20} color={colors.success} style={s.statIcon} />
          <Text style={s.statValue}>{monthlyRides}</Text>
          <Text style={s.statLabel}>{t("monthly_rides")}</Text>
        </View>

        <View style={s.statCard}>
          <Feather name="users" size={20} color="#a8dadc" style={s.statIcon} />
          <Text style={s.statValue}>{referrals}</Text>
          <Text style={s.statLabel}>{t("referrals")}</Text>
        </View>
      </View>

      {/* Trophies Section */}
      {trophies.length > 0 && (
        <View style={s.trophySection}>
          <Text style={s.sectionTitle}>🏆 Trophies</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.trophyRow}>
              {trophies.map((trophy: string, idx: number) => (
                <View key={idx} style={s.trophyChip}>
                  <Feather name="award" size={14} color="#FFD700" />
                  <Text style={s.trophyText}>{trophy}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Features Unlocked */}
      {featuresUnlocked.length > 0 && (
        <View style={s.featuresSection}>
          <Text style={s.sectionTitle}>🔓 Unlocked Features</Text>
          {featuresUnlocked.map((feature: string, idx: number) => (
            <View key={idx} style={s.featureItem}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={s.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    greeting: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    name: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      backgroundColor: colors.backgroundCard,
      borderColor: colors.border,
    },
    badge: {
      position: "absolute",
      top: 10,
      right: 12,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      zIndex: 1,
    },
    tierCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 16,
      backgroundColor: colors.backgroundCard,
    },
    tierInfo: {
      marginLeft: 16,
      flex: 1,
    },
    tierTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
    },
    tierSubtitle: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      marginTop: 2,
      color: colors.textSecondary,
    },
    cycleTag: {
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    cycleText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
    },
    walletCard: {
      padding: 24,
      borderRadius: 16,
      marginBottom: 24,
      backgroundColor: colors.secondary,
    },
    walletRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
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
      color: "#fff",
    },
    walletRight: {
      alignItems: "flex-end",
    },
    earningsLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.5)",
      marginBottom: 4,
    },
    earningsAmount: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: "#10B981",
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
      textAlign: "center",
      color: colors.textPrimary,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },
    statCard: {
      width: "48%",
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: colors.backgroundCard,
      borderColor: colors.border,
    },
    statIcon: {
      marginBottom: 12,
    },
    statValue: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    statSubValue: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      marginTop: 4,
      color: colors.textSecondary,
    },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      marginTop: 12,
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    },
    progressFill: {
      height: 4,
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 12,
    },
    trophySection: {
      marginTop: 24,
    },
    trophyRow: {
      flexDirection: "row",
      gap: 10,
    },
    trophyChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: isDark ? "rgba(255,215,0,0.1)" : "rgba(255,215,0,0.12)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,215,0,0.2)" : "rgba(255,215,0,0.25)",
    },
    trophyText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: "#FFD700",
    },
    featuresSection: {
      marginTop: 20,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    featureText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textPrimary,
    },
  });
