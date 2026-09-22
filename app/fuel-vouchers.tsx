import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  Platform,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { fuelVoucherApi, walletApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Fuel Colors ────────────────────────────────────────────────────────────
const FUEL = {
  gold: "#FFD700",
  goldDark: "#B8960C",
  goldLight: "#FFF4CC",
  green: "#00D084",
  greenDark: "#00A86B",
  greenLight: "#E0FFF0",
  black: "#1A1A1A",
  blackCard: "#222222",
  orange: "#FF8C00",
  white: "#FFFFFF",
};

const EMPTY_DAILY = { momoUsed: 0, qrUsed: 0, momoLimit: 0, qrLimit: 0 };
const EMPTY_SAVINGS = { weekTotal: 0, momoTotal: 0, qrTotal: 0 };

export default function FuelVouchersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, riderStatus } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [claimingMomo, setClaimingMomo] = useState(false);
  const [claimingQR, setClaimingQR] = useState(false);
  const [momoModalVisible, setMomoModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [activeQRCode, setActiveQRCode] = useState("");
  const [activeQRStation, setActiveQRStation] = useState("");
  const [stationFilter, setStationFilter] = useState<"all" | "rubis">("all");
  const [confettiVisible, setConfettiVisible] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Subtle pulse on hero buttons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const { data: dailyStatus, isError: dailyUnavailable } = useQuery({
    queryKey: ["fuel_daily"],
    queryFn: async () => {
      const res = await fuelVoucherApi.getDailyStatus();
      return res.data?.data || res.data;
    },
    staleTime: 30000,
  });

  const { data: history = [], isError: historyUnavailable } = useQuery({
    queryKey: ["fuel_history"],
    queryFn: async () => {
      const res = await fuelVoucherApi.getHistory();
      return res.data?.data?.vouchers || res.data?.vouchers || [];
    },
    staleTime: 30000,
  });

  const { data: savings } = useQuery({
    queryKey: ["fuel_savings"],
    queryFn: async () => {
      const res = await fuelVoucherApi.getWeeklySavings();
      return res.data?.data || res.data;
    },
  });

  const { data: walletData } = useQuery({
    queryKey: ["wallet_balance"],
    queryFn: async () => {
      const res = await walletApi.getBalance();
      return res.data?.data || res.data;
    },
  });

  const daily = dailyStatus || EMPTY_DAILY;
  const momoRemaining = daily.momoLimit - daily.momoUsed;
  const qrRemaining = daily.qrLimit - daily.qrUsed;
  const totalRemaining = momoRemaining + qrRemaining;
  const walletBalance = walletData?.balance || 0;
  const currentTier = riderStatus?.current_tier || user?.tier || "Tier 3";
  const weeklySavings = savings || EMPTY_SAVINGS;
  const stations: any[] = [];
  const filteredStations = stationFilter === "rubis"
    ? stations.filter((s) => s.name.toLowerCase().includes("rubis"))
    : stations;

  // ─── Haptics helper ─────────────────────────────────────────────────────────
  const haptic = (type: "light" | "medium" | "heavy" | "success" | "error" = "medium") => {
    if (Platform.OS === "web") return;
    try {
      if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else Haptics.impactAsync(
        type === "light" ? Haptics.ImpactFeedbackStyle.Light
          : type === "heavy" ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Medium
      );
    } catch {}
  };

  // ─── Confetti animation ─────────────────────────────────────────────────────
  const showConfetti = () => {
    setConfettiVisible(true);
    confettiAnim.setValue(0);
    Animated.timing(confettiAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start(() => setConfettiVisible(false));
  };

  // ─── Bounce animation ──────────────────────────────────────────────────────
  const triggerBounce = () => {
    bounceAnim.setValue(0);
    Animated.sequence([
      Animated.spring(bounceAnim, { toValue: -20, friction: 3, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  // ─── Claim MoMo Fuel ────────────────────────────────────────────────────────
  const handleClaimMoMo = async () => {
    if (momoRemaining <= 0) {
      alert("You've used all MoMo vouchers today. Come back tomorrow!");
      return;
    }
    haptic("medium");
    setClaimingMomo(true);
    try {
      await fuelVoucherApi.claimMoMo();
      haptic("success");
      triggerBounce();
      queryClient.invalidateQueries({ queryKey: ["fuel_daily"] });
      queryClient.invalidateQueries({ queryKey: ["fuel_history"] });
      setMomoModalVisible(true);
      if (momoRemaining - 1 + qrRemaining <= 0) showConfetti();
    } catch (err: any) {
      haptic("error");
      alert(err.response?.data?.message || "Failed to claim MoMo voucher");
    } finally {
      setClaimingMomo(false);
    }
  };

  // ─── Claim QR Fuel ──────────────────────────────────────────────────────────
  const handleClaimQR = async () => {
    if (qrRemaining <= 0) {
      alert("You've used all QR vouchers today. Come back tomorrow!");
      return;
    }
    haptic("medium");
    setClaimingQR(true);
    try {
      const res = await fuelVoucherApi.claimQR();
      const data = res.data?.data || res.data;
      haptic("success");
      setActiveQRCode(data?.qrCode || `MOTA-QR-${Date.now()}`);
      setActiveQRStation(data?.station || "Rubis Nyabugogo");
      queryClient.invalidateQueries({ queryKey: ["fuel_daily"] });
      queryClient.invalidateQueries({ queryKey: ["fuel_history"] });
      setQrModalVisible(true);
      if (qrRemaining - 1 + momoRemaining <= 0) showConfetti();
    } catch (err: any) {
      haptic("error");
      alert(err.response?.data?.message || "Failed to generate QR voucher");
    } finally {
      setClaimingQR(false);
    }
  };

  // ─── Voucher status badge ──────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "redeemed": return { icon: "✅", color: FUEL.green, label: "Redeemed" };
      case "active": return { icon: "⛽", color: FUEL.gold, label: "Active" };
      case "expired": return { icon: "🚫", color: "#EF4444", label: "Expired" };
      default: return { icon: "⏳", color: "#9CA3AF", label: "Pending" };
    }
  };

  const s = styles(colors);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={FUEL.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.goldBadge}>
            <Text style={s.goldBadgeText}>🏆 FUEL POWER</Text>
          </View>
        </View>
        <TouchableOpacity style={s.headerRight} onPress={() => router.push("/notifications" as any)}>
          <Feather name="bell" size={20} color={FUEL.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {(dailyUnavailable || historyUnavailable) && (
          <View style={{ margin: 16, padding: 14, borderRadius: 12, backgroundColor: "#7F1D1D" }}>
            <Text style={{ color: FUEL.white, fontWeight: "700" }}>Fuel voucher service unavailable</Text>
            <Text style={{ color: FUEL.white, marginTop: 4 }}>Live limits or history could not be loaded. No demo values are being shown.</Text>
          </View>
        )}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          {/* ── Tier & Daily Status ──────────────────────────────────────── */}
          <View style={s.statusBar}>
            <View style={s.tierBadge}>
              <Text style={s.tierText}>{currentTier} Gold ⛽</Text>
            </View>
            <View style={s.dailyCounter}>
              <Text style={s.dailyCounterNumber}>{totalRemaining}</Text>
              <Text style={s.dailyCounterLabel}>/{daily.momoLimit + daily.qrLimit} today</Text>
            </View>
            <View style={s.walletChip}>
              <Feather name="credit-card" size={12} color={FUEL.green} />
              <Text style={s.walletChipText}>{walletBalance.toLocaleString()} RWF</Text>
            </View>
          </View>

          {/* ── Hero Action Buttons ─────────────────────────────────────── */}
          <View style={s.heroSection}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }, { translateY: bounceAnim }] }}>
              <TouchableOpacity
                style={[s.heroBtn, s.heroBtnGreen, momoRemaining <= 0 && s.heroBtnDisabled]}
                onPress={handleClaimMoMo}
                disabled={claimingMomo || momoRemaining <= 0}
                activeOpacity={0.85}
              >
                {claimingMomo ? (
                  <ActivityIndicator color={FUEL.white} size="large" />
                ) : (
                  <>
                    <View style={s.heroBtnIconRow}>
                      <Text style={s.heroBtnEmoji}>📱</Text>
                      <Text style={s.heroBtnEmoji}>💧</Text>
                    </View>
                    <Text style={s.heroBtnTitle}>CLAIM 1k MOMO FUEL</Text>
                    <Text style={s.heroBtnSub}>→ Request MoMo voucher fulfillment</Text>
                    {momoRemaining <= 0 && <Text style={s.heroBtnSoldOut}>TODAY'S LIMIT REACHED</Text>}
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[s.heroBtn, s.heroBtnGold, qrRemaining <= 0 && s.heroBtnDisabled]}
                onPress={handleClaimQR}
                disabled={claimingQR || qrRemaining <= 0}
                activeOpacity={0.85}
              >
                {claimingQR ? (
                  <ActivityIndicator color={FUEL.black} size="large" />
                ) : (
                  <>
                    <View style={s.heroBtnIconRow}>
                      <Text style={s.heroBtnEmoji}>📷</Text>
                      <Text style={s.heroBtnEmoji}>👑</Text>
                    </View>
                    <Text style={[s.heroBtnTitle, { color: FUEL.black }]}>VIP QR RUBIS (1k)</Text>
                    <Text style={[s.heroBtnSub, { color: FUEL.black + "CC" }]}>→ Premium discount → Show QR at station</Text>
                    {qrRemaining <= 0 && <Text style={[s.heroBtnSoldOut, { color: FUEL.black }]}>TODAY'S LIMIT REACHED</Text>}
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* ── Quick Stats Cards ───────────────────────────────────────── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
            {/* Card 1: Weekly savings */}
            <View style={[s.statsCard, { borderColor: FUEL.green + "40" }]}>
              <View style={s.statsCardHeader}>
                <View style={[s.statsIconCircle, { backgroundColor: FUEL.green + "20" }]}>
                  <Feather name="trending-up" size={16} color={FUEL.green} />
                </View>
              </View>
              <Text style={s.statsValue}>{(weeklySavings.weekTotal || 0).toLocaleString()} RWF</Text>
              <Text style={s.statsLabel}>This Week Saved</Text>
            </View>

            {/* Card 2: Today's usage */}
            <View style={[s.statsCard, { borderColor: FUEL.gold + "40" }]}>
              <View style={s.statsCardHeader}>
                <View style={[s.statsIconCircle, { backgroundColor: FUEL.gold + "20" }]}>
                  <Feather name="bar-chart-2" size={16} color={FUEL.gold} />
                </View>
              </View>
              <Text style={s.statsValue}>MoMo: {daily.momoUsed}/{daily.momoLimit}</Text>
              <View style={s.progressBarWrap}>
                <View style={[s.progressBar, { width: `${daily.momoLimit ? (daily.momoUsed / daily.momoLimit) * 100 : 0}%`, backgroundColor: FUEL.green }]} />
              </View>
              <Text style={[s.statsValue, { marginTop: 4 }]}>QR: {daily.qrUsed}/{daily.qrLimit}</Text>
              <View style={s.progressBarWrap}>
                <View style={[s.progressBar, { width: `${daily.qrLimit ? (daily.qrUsed / daily.qrLimit) * 100 : 0}%`, backgroundColor: FUEL.gold }]} />
              </View>
            </View>

            {/* Card 3: Nearest station */}
            <View style={[s.statsCard, { borderColor: colors.primary + "40" }]}>
              <View style={s.statsCardHeader}>
                <View style={[s.statsIconCircle, { backgroundColor: colors.primary + "20" }]}>
                  <Feather name="map-pin" size={16} color={colors.primary} />
                </View>
              </View>
              <Text style={s.statsValue}>500m</Text>
              <Text style={s.statsLabel}>Nearest Rubis</Text>
              <Text style={[s.statsLabel, { color: colors.primary, fontSize: 11, marginTop: 4 }]}>Nyabugogo →</Text>
            </View>
          </ScrollView>

          {/* ── Voucher History ──────────────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Voucher History</Text>
              <TouchableOpacity>
                <Text style={s.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>

            {(history || []).map((item: any) => {
              const badge = getStatusBadge(item.status);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={s.historyCard}
                  onPress={() => {
                    if (item.status === "active" && item.type === "qr") {
                      setActiveQRCode(item.qrCode || "");
                      setActiveQRStation(item.station || "");
                      setQrModalVisible(true);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[s.historyIcon, { backgroundColor: badge.color + "20" }]}>
                    <Text style={{ fontSize: 18 }}>{badge.icon}</Text>
                  </View>
                  <View style={s.historyInfo}>
                    <Text style={s.historyTitle}>
                      {item.type === "momo" ? "MoMo Fuel" : "QR Rubis"} {(item.amount / 1000).toFixed(0)}k
                    </Text>
                    <Text style={s.historyMeta}>
                      {item.station} • {item.time}
                    </Text>
                  </View>
                  <View style={[s.historyBadge, { backgroundColor: badge.color + "20" }]}>
                    <Text style={[s.historyBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Nearby Stations ──────────────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Nearby Stations</Text>
            </View>

            {/* Filter toggles */}
            <View style={s.filterRow}>
              <TouchableOpacity
                style={[s.filterBtn, stationFilter === "all" && s.filterBtnActive]}
                onPress={() => setStationFilter("all")}
              >
                <Text style={[s.filterBtnText, stationFilter === "all" && s.filterBtnTextActive]}>
                  ⛽ All Stations
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.filterBtn, stationFilter === "rubis" && s.filterBtnActive]}
                onPress={() => setStationFilter("rubis")}
              >
                <Text style={[s.filterBtnText, stationFilter === "rubis" && s.filterBtnTextActive]}>
                  👑 QR Rubis Only
                </Text>
              </TouchableOpacity>
            </View>

            {/* Station list (Map placeholder) */}
            <View style={s.mapPlaceholder}>
              <Feather name="map" size={32} color={FUEL.green} />
              <Text style={s.mapPlaceholderText}>Station Map</Text>
              <Text style={s.mapPlaceholderSub}>{filteredStations.length} stations nearby</Text>
            </View>

            {filteredStations.map((station) => (
              <TouchableOpacity key={station.id} style={s.stationCard} activeOpacity={0.7}>
                <View style={s.stationPin}>
                  <Feather name="map-pin" size={18} color={FUEL.green} />
                </View>
                <View style={s.stationInfo}>
                  <Text style={s.stationName}>{station.name}</Text>
                  <Text style={s.stationMeta}>Open {station.hours} • {station.distance}</Text>
                </View>
                <View style={s.stationNav}>
                  <Feather name="navigation" size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
            {filteredStations.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 16 }}>
                No live station directory is configured yet.
              </Text>
            )}
          </View>

          {/* ── Weekly Savings Tracker ───────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Fuel Savings Tracker</Text>
            </View>
            <View style={s.savingsCard}>
              <Text style={s.savingsTitle}>This Week</Text>
              <Text style={s.savingsAmount}>{(weeklySavings.weekTotal || 0).toLocaleString()} RWF Saved!</Text>

              <View style={s.savingsBarRow}>
                <View style={s.savingsBarItem}>
                  <Text style={s.savingsBarLabel}>MoMo</Text>
                  <View style={s.savingsBarTrack}>
                    <View style={[s.savingsBarFill, {
                      width: weeklySavings.weekTotal ? `${(weeklySavings.momoTotal / weeklySavings.weekTotal) * 100}%` : "0%",
                      backgroundColor: FUEL.green,
                    }]} />
                  </View>
                  <Text style={s.savingsBarValue}>{(weeklySavings.momoTotal || 0).toLocaleString()}</Text>
                </View>
                <View style={s.savingsBarItem}>
                  <Text style={s.savingsBarLabel}>QR</Text>
                  <View style={s.savingsBarTrack}>
                    <View style={[s.savingsBarFill, {
                      width: weeklySavings.weekTotal ? `${(weeklySavings.qrTotal / weeklySavings.weekTotal) * 100}%` : "0%",
                      backgroundColor: FUEL.gold,
                    }]} />
                  </View>
                  <Text style={s.savingsBarValue}>{(weeklySavings.qrTotal || 0).toLocaleString()}</Text>
                </View>
              </View>

              <View style={s.rankBadge}>
                <Text style={s.rankText}>🏆 Rank #{weeklySavings.rank || "—"} Kigali Fuel Savers</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Confetti Overlay ────────────────────────────────────────────── */}
      {confettiVisible && (
        <Animated.View
          style={[s.confettiOverlay, { opacity: Animated.multiply(confettiAnim, Animated.subtract(new Animated.Value(1.5), confettiAnim)), pointerEvents: 'none' }]}
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <Animated.Text
              key={i}
              style={[
                s.confettiPiece,
                {
                  left: `${Math.random() * 100}%` as any,
                  transform: [
                    { translateY: Animated.multiply(confettiAnim, new Animated.Value(600)) },
                    { rotate: `${Math.random() * 360}deg` },
                  ],
                },
              ]}
            >
              {["🏆", "⛽", "🎉", "💰", "🔥", "✨"][i % 6]}
            </Animated.Text>
          ))}
        </Animated.View>
      )}

      {/* ── MoMo Confirmation Modal ────────────────────────────────────── */}
      <Modal visible={momoModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalIconWrap}>
              <Text style={{ fontSize: 56 }}>📱</Text>
            </View>
            <Text style={s.modalTitle}>MoMo voucher requested</Text>
            <View style={s.smsPreview}>
              <Text style={s.smsLabel}>Status</Text>
              <Text style={s.smsText}>
                Your request is pending fulfillment. The app will not claim funds were sent until the payment provider confirms delivery.
              </Text>
            </View>
            <View style={s.modalSteps}>
              <View style={s.modalStep}>
                <View style={[s.modalStepNum, { backgroundColor: FUEL.green }]}>
                  <Text style={s.modalStepNumText}>1</Text>
                </View>
                <Text style={s.modalStepText}>Go to any fuel station</Text>
              </View>
              <View style={s.modalStep}>
                <View style={[s.modalStepNum, { backgroundColor: FUEL.gold }]}>
                  <Text style={[s.modalStepNumText, { color: FUEL.black }]}>2</Text>
                </View>
                <Text style={s.modalStepText}>Wait for confirmed delivery</Text>
              </View>
              <View style={s.modalStep}>
                <View style={[s.modalStepNum, { backgroundColor: colors.primary }]}>
                  <Text style={s.modalStepNumText}>3</Text>
                </View>
                <Text style={s.modalStepText}>Show confirmation to attendant</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.modalDoneBtn}
              onPress={() => {
                haptic("light");
                setMomoModalVisible(false);
              }}
            >
              <Feather name="check" size={20} color={FUEL.white} />
              <Text style={s.modalDoneBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── QR Voucher Detail Modal ────────────────────────────────────── */}
      <Modal visible={qrModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.qrHeader}>
              <Text style={s.modalTitle}>Rubis Fuel Voucher</Text>
              <Text style={s.qrStation}>{activeQRStation} — 1k Fuel</Text>
            </View>

            {/* QR Code placeholder (visual representation) */}
            <View style={s.qrCodeArea}>
              <View style={s.qrCodeBox}>
                {/* Simulated QR pattern */}
                <View style={s.qrPattern}>
                  {Array.from({ length: 64 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        s.qrDot,
                        { backgroundColor: Math.random() > 0.4 ? FUEL.black : "transparent" },
                      ]}
                    />
                  ))}
                </View>
                <Text style={s.qrCenterText}>MOTA</Text>
              </View>
              <Text style={s.qrCodeText}>{activeQRCode}</Text>
            </View>

            <View style={s.qrTimerRow}>
              <Feather name="clock" size={14} color={FUEL.orange} />
              <Text style={s.qrTimerText}>Expires: 23:59 Today</Text>
            </View>

            <View style={s.qrActions}>
              <TouchableOpacity
                style={s.qrActionBtn}
                onPress={() => {
                  haptic("light");
                  // Copy to clipboard would go here
                  alert(`Copied: ${activeQRCode}`);
                }}
              >
                <Feather name="copy" size={16} color={colors.primary} />
                <Text style={s.qrActionText}>COPY CODE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.qrActionBtn, { backgroundColor: "#25D366" + "20" }]}
                onPress={async () => {
                  haptic("light");
                  await Share.share({
                    message: `Mota Fuel Voucher: ${activeQRCode}\nStation: ${activeQRStation}\nAmount: 1,000 RWF\nExpires: Today 23:59`,
                  });
                }}
              >
                <Text style={{ fontSize: 16 }}>💬</Text>
                <Text style={[s.qrActionText, { color: "#25D366" }]}>WHATSAPP</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.modalDoneBtn, { backgroundColor: FUEL.gold }]}
              onPress={() => {
                haptic("light");
                setQrModalVisible(false);
              }}
            >
              <Feather name="x" size={20} color={FUEL.black} />
              <Text style={[s.modalDoneBtnText, { color: FUEL.black }]}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: FUEL.black },
    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ffffff15", alignItems: "center", justifyContent: "center" },
    headerCenter: { flex: 1, alignItems: "center" },
    goldBadge: {
      backgroundColor: FUEL.gold + "25",
      borderWidth: 1,
      borderColor: FUEL.gold + "50",
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    goldBadgeText: { color: FUEL.gold, fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
    headerRight: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: FUEL.gold + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    // Status bar
    statusBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: "#ffffff08",
      marginHorizontal: 16,
      borderRadius: 14,
      marginBottom: 16,
    },
    tierBadge: {
      backgroundColor: FUEL.gold + "20",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    tierText: { color: FUEL.gold, fontFamily: "Inter_600SemiBold", fontSize: 11 },
    dailyCounter: { flexDirection: "row", alignItems: "baseline" },
    dailyCounterNumber: { color: FUEL.green, fontFamily: "Inter_700Bold", fontSize: 28 },
    dailyCounterLabel: { color: "#9CA3AF", fontFamily: "Inter_400Regular", fontSize: 12, marginLeft: 2 },
    walletChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: FUEL.green + "15",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    walletChipText: { color: FUEL.green, fontFamily: "Inter_500Medium", fontSize: 11 },
    // Hero buttons
    heroSection: { paddingHorizontal: 16, gap: 12, marginBottom: 20 },
    heroBtn: {
      borderRadius: 20,
      padding: 22,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 10,
    },
    heroBtnGreen: {
      backgroundColor: FUEL.green,
      borderWidth: 2,
      borderColor: FUEL.greenDark,
    },
    heroBtnGold: {
      backgroundColor: FUEL.gold,
      borderWidth: 2,
      borderColor: FUEL.goldDark,
    },
    heroBtnDisabled: { opacity: 0.45 },
    heroBtnIconRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    heroBtnEmoji: { fontSize: 28 },
    heroBtnTitle: {
      color: FUEL.white,
      fontFamily: "Inter_700Bold",
      fontSize: 20,
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    heroBtnSub: {
      color: FUEL.white + "CC",
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      textAlign: "center",
    },
    heroBtnSoldOut: {
      color: FUEL.white,
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      marginTop: 8,
      backgroundColor: "#00000040",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 6,
      overflow: "hidden",
    },
    // Stats cards
    statsRow: { paddingHorizontal: 16, gap: 12, marginBottom: 24 },
    statsCard: {
      width: SCREEN_WIDTH * 0.42,
      backgroundColor: FUEL.blackCard,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
    },
    statsCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    statsIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    statsValue: { color: FUEL.white, fontFamily: "Inter_700Bold", fontSize: 16 },
    statsLabel: { color: "#9CA3AF", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
    progressBarWrap: {
      height: 4,
      backgroundColor: "#ffffff15",
      borderRadius: 2,
      marginTop: 6,
      overflow: "hidden",
    },
    progressBar: { height: 4, borderRadius: 2 },
    // Section
    section: { paddingHorizontal: 16, marginBottom: 24 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitle: { color: FUEL.white, fontFamily: "Inter_600SemiBold", fontSize: 16 },
    sectionLink: { color: FUEL.gold, fontFamily: "Inter_500Medium", fontSize: 13 },
    // History
    historyCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: FUEL.blackCard,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },
    historyIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginRight: 12 },
    historyInfo: { flex: 1 },
    historyTitle: { color: FUEL.white, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    historyMeta: { color: "#9CA3AF", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
    historyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    historyBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5 },
    // Filter
    filterRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
    filterBtn: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: "#ffffff10",
      borderWidth: 1,
      borderColor: "#ffffff15",
    },
    filterBtnActive: {
      backgroundColor: FUEL.gold + "20",
      borderColor: FUEL.gold + "50",
    },
    filterBtnText: { color: "#9CA3AF", fontFamily: "Inter_500Medium", fontSize: 13 },
    filterBtnTextActive: { color: FUEL.gold },
    // Map placeholder
    mapPlaceholder: {
      height: 140,
      backgroundColor: "#ffffff08",
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: FUEL.green + "25",
      borderStyle: "dashed",
      marginBottom: 14,
    },
    mapPlaceholderText: { color: FUEL.green, fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 8 },
    mapPlaceholderSub: { color: "#9CA3AF", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
    // Stations
    stationCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: FUEL.blackCard,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    stationPin: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: FUEL.green + "20",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    stationInfo: { flex: 1 },
    stationName: { color: FUEL.white, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    stationMeta: { color: "#9CA3AF", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
    stationNav: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    // Savings card
    savingsCard: {
      backgroundColor: FUEL.blackCard,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1.5,
      borderColor: FUEL.gold + "30",
    },
    savingsTitle: { color: "#9CA3AF", fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 4 },
    savingsAmount: { color: FUEL.gold, fontFamily: "Inter_700Bold", fontSize: 24, marginBottom: 20 },
    savingsBarRow: { gap: 14 },
    savingsBarItem: { flexDirection: "row", alignItems: "center", gap: 10 },
    savingsBarLabel: { color: "#9CA3AF", fontFamily: "Inter_500Medium", fontSize: 12, width: 40 },
    savingsBarTrack: { flex: 1, height: 8, backgroundColor: "#ffffff15", borderRadius: 4, overflow: "hidden" },
    savingsBarFill: { height: 8, borderRadius: 4 },
    savingsBarValue: { color: FUEL.white, fontFamily: "Inter_600SemiBold", fontSize: 12, width: 50, textAlign: "right" },
    rankBadge: {
      marginTop: 16,
      backgroundColor: FUEL.gold + "15",
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    rankText: { color: FUEL.gold, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    // Confetti
    confettiOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 999,
      pointerEvents: "none",
    },
    confettiPiece: {
      position: "absolute",
      top: -30,
      fontSize: 22,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: FUEL.blackCard,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 40,
    },
    modalIconWrap: { alignItems: "center", marginBottom: 16 },
    modalTitle: {
      color: FUEL.white,
      fontFamily: "Inter_700Bold",
      fontSize: 22,
      textAlign: "center",
      marginBottom: 6,
    },
    smsPreview: {
      backgroundColor: "#ffffff08",
      borderRadius: 14,
      padding: 16,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: FUEL.green + "25",
    },
    smsLabel: { color: FUEL.green, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
    smsText: { color: FUEL.white, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
    modalSteps: { gap: 12, marginBottom: 20 },
    modalStep: { flexDirection: "row", alignItems: "center", gap: 12 },
    modalStepNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    modalStepNumText: { color: FUEL.white, fontFamily: "Inter_700Bold", fontSize: 14 },
    modalStepText: { color: "#D1D5DB", fontFamily: "Inter_400Regular", fontSize: 14 },
    modalDoneBtn: {
      backgroundColor: FUEL.green,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    modalDoneBtnText: { color: FUEL.white, fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 1 },
    // QR Modal
    qrHeader: { alignItems: "center", marginBottom: 16 },
    qrStation: { color: FUEL.gold, fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 4 },
    qrCodeArea: { alignItems: "center", marginBottom: 16 },
    qrCodeBox: {
      width: SCREEN_WIDTH * 0.55,
      height: SCREEN_WIDTH * 0.55,
      backgroundColor: FUEL.white,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      position: "relative",
    },
    qrPattern: {
      width: "100%",
      height: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
    },
    qrDot: { width: "10%", aspectRatio: 1, borderRadius: 1 },
    qrCenterText: {
      position: "absolute",
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: FUEL.black,
      backgroundColor: FUEL.white,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    qrCodeText: { color: "#9CA3AF", fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 10, letterSpacing: 1 },
    qrTimerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 },
    qrTimerText: { color: FUEL.orange, fontFamily: "Inter_500Medium", fontSize: 13 },
    qrActions: { flexDirection: "row", gap: 12, marginBottom: 16 },
    qrActionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.primary + "15",
      borderRadius: 12,
      paddingVertical: 12,
    },
    qrActionText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.5 },
  });
