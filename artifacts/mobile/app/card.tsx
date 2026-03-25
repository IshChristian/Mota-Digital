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
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import QRCode from "react-native-qrcode-svg";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { driverApi } from "@/services/api";

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

  const { data: dashData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await driverApi.getDashboard();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const tier = (dashData?.tier || user?.tier || "bronze").toLowerCase();
  const tierColor = TIER_ACCENT[tier] || Colors.tier.bronze;
  const gradientColors = TIER_GRADIENTS[tier] || TIER_GRADIENTS.bronze;

  const driverName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "DRIVER";
  const last4 = user?.id ? user.id.slice(-4).toUpperCase() : "0000";

  const qrData = JSON.stringify({
    driverId: user?.id,
    phone: user?.phone,
    name: driverName,
    tier,
  });

  const copyId = () => {
    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(user?.id || "");
      }
    } else {
      const RN = require("react-native");
      RN.Clipboard?.setString(user?.id || "");
    }
    Alert.alert("Copied", "Driver ID copied to clipboard");
  };

  const shareCard = async () => {
    try {
      await Share.share({
        message: `MOTA Driver Card\nName: ${driverName}\nTier: ${tier.toUpperCase()}\nID: ${user?.id || ""}`,
        title: "My MOTA Card",
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.backgroundCard }]}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>MOTA Card</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {/* Virtual Card */}
        <LinearGradient
          colors={gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: tierColor + "55" }]}
        >
          {/* Top glow line */}
          <View style={[styles.cardGlow, { backgroundColor: tierColor }]} />

          <View style={styles.cardHeader}>
            <Text style={styles.logo}>MOTA</Text>
            <View style={[styles.tierBadge, { backgroundColor: tierColor + "33", borderColor: tierColor }]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tier.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardNumber}>MOTA •••• •••• {last4}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>DRIVER</Text>
              <Text style={styles.cardName}>{driverName.toUpperCase()}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.cardLabel}>TIER STATUS</Text>
              <Text style={[styles.cardName, { color: tierColor }]}>{tier.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={copyId}
          >
            <Feather name="copy" size={20} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Copy ID</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={shareCard}
          >
            <Feather name="share-2" size={20} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Text style={[styles.qrLabel, { color: colors.textSecondary }]}>Scan to verify driver</Text>
          <View style={[styles.qrWrapper, { backgroundColor: isDark ? "#fff" : "#fff", borderColor: tierColor }]}>
            <QRCode
              value={qrData}
              size={180}
              color="#0A0E1A"
              backgroundColor="#fff"
            />
          </View>
          <Text style={[styles.driverId, { color: colors.textSecondary }]}>ID: {user?.id?.slice(0, 12)}...</Text>
        </View>
      </View>
    </View>
  );
}

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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
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
  logo: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 4,
  },
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
    gap: 16,
    marginTop: 28,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
  },
  actionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  qrContainer: {
    marginTop: 36,
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
  },
  driverId: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
