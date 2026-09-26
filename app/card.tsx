import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import QRCode from "react-native-qrcode-svg";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { walletApi, algorithmApi, driverApi } from "@/services/api";

const { width } = Dimensions.get("window");

const TIER_GRADIENTS: Record<string, string[]> = {
  bronze: ["#3D2A1A", "#1A0D00"],
  silver: ["#2A2A2E", "#0F0F12"],
  gold: ["#3D3010", "#1A1200"],
  platinum: ["#1A1D2E", "#0A0E1A"],
  gorilla: ["#0D2B2A", "#041010"],
};

const TIER_ACCENT: Record<string, string> = {
  bronze: Colors.tier.bronze,
  silver: Colors.tier.silver,
  gold: Colors.tier.gold,
  platinum: Colors.tier.platinum,
  gorilla: Colors.tier.gorilla,
};

export default function CardScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Real wallet balance
  const { data: balanceData, isLoading: balLoading } = useQuery({
    queryKey: ["wallet_balance"],
    queryFn: async () => {
      const res = await walletApi.getBalance();
      return res.data;
    },
    staleTime: 30000,
  });

  // Real algorithm status (tier, streaks, rides, trophies)
  const { data: algoData, isLoading: algoLoading } = useQuery({
    queryKey: ["rider_status"],
    queryFn: async () => {
      const res = await algorithmApi.getRiderStatus();
      return res.data?.data || res.data;
    },
    staleTime: 60000,
  });

  // Real earnings data
  const { data: earningsData } = useQuery({
    queryKey: ["rider_earnings"],
    queryFn: async () => {
      const res = await algorithmApi.getRiderEarnings();
      return res.data?.data || res.data;
    },
    staleTime: 60000,
  });

  const { data: driverProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["driver_profile"],
    queryFn: async () => {
      const res = await driverApi.getProfile();
      return res.data?.data || res.data;
    },
    staleTime: 60000,
  });

  const balance = balanceData?.balance ?? 0;
  const tier = (algoData?.current_tier || user?.tier || "bronze").toLowerCase();
  const tierColor = TIER_ACCENT[tier] || Colors.tier.bronze;
  const gradientColors = TIER_GRADIENTS[tier] || TIER_GRADIENTS.bronze;

  const driverName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "DRIVER";
  const plateNumber = String(driverProfile?.plateNumber || "").trim().toUpperCase();
  const displayPlate = plateNumber || "PLATE PENDING";

  const qrData = JSON.stringify({
    plateNumber,
    phone: user?.phone,
    name: driverName,
    tier,
  });

  const copyPlateNumber = async () => {
    if (!plateNumber) {
      Alert.alert("Plate unavailable", "Your verified plate number is not available yet.");
      return;
    }
    try {
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(plateNumber);
        }
      } else {
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(plateNumber);
      }
      Alert.alert("Copied", "Plate number copied to clipboard");
    } catch {
      Alert.alert("Error", "Could not copy plate number");
    }
  };

  const shareCard = async () => {
    try {
      await Share.share({
        message: `MOTA Driver Membership\nName: ${driverName}\nTier: ${tier.toUpperCase()}\nPhone: ${user?.phone || ""}\nPlate: ${displayPlate}`,
        title: "My MOTA Membership",
      });
    } catch {}
  };

  const isLoading = balLoading || algoLoading || profileLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Membership Card</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Membership credential; this is not a bank or payment card. */}
        <LinearGradient
          colors={gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: tierColor + "55" }]}
        >
          <View style={[styles.cardGlow, { backgroundColor: tierColor }]} />

          <View style={styles.cardHeader}>
            <Image
              source={require("@/assets/images/official-mota-white-logo-removebg-preview.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View style={[styles.tierBadge, { backgroundColor: tierColor + "33", borderColor: tierColor }]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tier.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardNumber}>PLATE • {displayPlate}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>DRIVER</Text>
              <Text style={styles.cardName}>{driverName.toUpperCase()}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.cardLabel}>BALANCE</Text>
              <Text style={[styles.cardName, { color: "#10B981" }]}>
                {isLoading ? "..." : `${balance.toLocaleString()} RWF`}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[s(colors, isDark).primaryActionBtn]}
            onPress={() => router.push("/send-money")}
          >
            <View style={s(colors, isDark).primaryActionIcon}>
              <Feather name="send" size={20} color="#fff" />
            </View>
            <Text style={s(colors, isDark).primaryActionText}>Send Money</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s(colors, isDark).secondaryActionBtn]}
            onPress={shareCard}
          >
            <View style={[s(colors, isDark).secondaryActionIcon]}>
              <Feather name="share-2" size={20} color={colors.primary} />
            </View>
            <Text style={s(colors, isDark).secondaryActionText}>Share Card</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Row */}
        <View style={s(colors, isDark).quickRow}>
          <TouchableOpacity style={s(colors, isDark).quickAction} onPress={copyPlateNumber}>
            <Feather name="copy" size={18} color={colors.textSecondary} />
            <Text style={s(colors, isDark).quickActionText}>Copy Plate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s(colors, isDark).quickAction}
            onPress={() => router.push("/(driver)/wallet" as any)}
          >
            <Feather name="credit-card" size={18} color={colors.textSecondary} />
            <Text style={s(colors, isDark).quickActionText}>Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s(colors, isDark).quickAction}
            onPress={() => router.push("/loans")}
          >
            <Feather name="briefcase" size={18} color={colors.textSecondary} />
            <Text style={s(colors, isDark).quickActionText}>Loans</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Text style={[styles.qrLabel, { color: colors.textSecondary }]}>Scan to verify or receive money</Text>
          <View style={[styles.qrWrapper, { borderColor: tierColor }]}>
            <QRCode
              value={qrData}
              size={180}
              color="#0A0E1A"
              backgroundColor="#fff"
            />
          </View>
          <Text style={[styles.driverId, { color: colors.textSecondary }]}>Plate: {displayPlate}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 24,
    },
    infoCard: {
      width: "48%",
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    infoLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    statsSection: {
      marginTop: 24,
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statNumber: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginTop: 4,
    },
    statDivider: {
      width: 1,
      height: 36,
      backgroundColor: colors.border,
    },
    trophiesSection: {
      marginTop: 20,
    },
    trophiesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    trophyChip: {
      backgroundColor: isDark ? "rgba(255,215,0,0.12)" : "rgba(255,215,0,0.15)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,215,0,0.2)" : "rgba(255,215,0,0.3)",
    },
    trophyText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: "#FFD700",
    },
    featuresSection: {
      marginTop: 20,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
    },
    featureText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textPrimary,
    },
    primaryActionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: 14,
      padding: 16,
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    primaryActionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    primaryActionText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    secondaryActionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryActionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryActionText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    quickRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 20,
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickAction: {
      alignItems: "center",
      gap: 6,
    },
    quickActionText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    width: width - 48,
    height: 220,
    borderRadius: 20,
    padding: 24,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandLogo: { width: 112, height: 38 },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  cardBody: {
    alignItems: "center",
  },
  cardNumber: {
    fontSize: 20,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  qrContainer: {
    marginTop: 28,
    alignItems: "center",
  },
  qrLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 16,
  },
  qrWrapper: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: "#fff",
  },
  driverId: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
