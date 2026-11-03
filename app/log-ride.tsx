import { showMessage } from "@/components/GlobalAlert";
import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { driverApi, algorithmApi, getStoredToken, API_BASE_URL, transferApi, paymentApi } from "@/services/api";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { RwandaPhoneInput } from "@/components/RwandaPhoneInput";
import { normalizeRwandaPhone } from "@/utils/rwandaPhone";
import { useWideLayout } from "@/hooks/useWideLayout";

type Ride = {
  _id?: string;
  fare?: number;
  distance?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  paymentMethod?: string;
  createdAt?: string;
};

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "Unknown time";
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Unknown date";
  return new Date(dateStr).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LogRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [fare, setFare] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentWaiting, setPaymentWaiting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelStream = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPaymentWaiting(false);
    setSubmitting(false);
  };

  // Fetch rides
  const [page, setPage] = useState(1);
  const [allRides, setAllRides] = useState<Ride[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: ridesData, isLoading, refetch } = useQuery({
    queryKey: ["rides", 1],
    queryFn: async () => {
      const res = await driverApi.getRides(1);
      const rides: Ride[] = res.data?.rides || res.data?.data || res.data || [];
      setAllRides(rides);
      setPage(1);
      setHasMore(rides.length >= 20);
      return rides;
    },
    refetchInterval: 5000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await driverApi.getRides(nextPage);
      const more: Ride[] = res.data?.rides || res.data?.data || res.data || [];
      setAllRides((prev) => [...prev, ...more]);
      setPage(nextPage);
      setHasMore(more.length >= 20);
    } catch { }
    setLoadingMore(false);
  };

  // Split rides into today vs history
  const todayRides = allRides.filter((r) => isToday(r.createdAt));
  const historyRides = allRides.filter((r) => !isToday(r.createdAt));

  // Submit new ride
  const handleSubmit = async () => {
    if (!fare) {
      showMessage(t("pages.logride.need_fare"));
      return;
    }
    if (!normalizeRwandaPhone(passengerPhone)) {
      showMessage("Enter a valid Rwanda passenger phone number starting with 07 or 7");
      return;
    }
    setSubmitting(true);
    setPaymentWaiting(false);
    setPaymentSuccess(false);
    try {
      const res = await driverApi.logRide({
        fare: Number(fare),
        passengerPhone: normalizeRwandaPhone(passengerPhone),
        distance: 0,
        pickupLocation: "",
        dropoffLocation: "",
        paymentMethod: "momo",
      });
      const ref = res.data?.paypackRef || res.data?.data?.paypackRef || res.data?.ref || res.data?.data?.ref;

      if (ref) {
        setPaymentWaiting(true);

        pollIntervalRef.current = setInterval(async () => {
          try {
            const statusRes = await paymentApi.checkPaymentStatus(ref);
            const data = statusRes.data?.data || statusRes.data;
            const status = data?.status;

            if (status === 'completed' || status === 'successful') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;

              setPaymentWaiting(false);
              setPaymentSuccess(true);
              try { await algorithmApi.completeRide(); } catch { }

              // Hide modal after 2 seconds
              setTimeout(async () => {
                setFare("");
                setPassengerPhone("");
                setPaymentSuccess(false);
                setModalVisible(false);
                await refetch();
                queryClient.invalidateQueries({ queryKey: ["rider_status"] });
                queryClient.invalidateQueries({ queryKey: ["rider_earnings"] });
              }, 2500);
            } else if (status === 'failed') {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;

              setPaymentWaiting(false);
              showMessage("Payment failed. Passenger may have declined.");
              setSubmitting(false);
            }
          } catch (e) {
            // Silently ignore polling errors
          }
        }, 1000); // Poll every 1 second

      } else {
        // Fallback without SSE
        try { await algorithmApi.completeRide(); } catch { }
        setFare("");
        setPassengerPhone("");
        setModalVisible(false);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["rider_status"] });
        queryClient.invalidateQueries({ queryKey: ["rider_earnings"] });
        setSubmitting(false);
      }
    } catch (e: any) {
      showMessage(e.response?.data?.message || t("pages.logride.failed"));
      setSubmitting(false);
    }
  };

  const s = styles(colors, isDark);
  const { wide } = useWideLayout();
  const todayEarnings = todayRides.reduce((sum, r) => sum + Number(r.fare || 0), 0);
  const openForm = () => { setFare(""); setPassengerPhone(""); setModalVisible(true); };
  const close = () => router.canGoBack() ? router.back() : router.replace("/(driver)" as any);

  const RideCard = ({ ride }: { ride: Ride }) => (
    <View style={s.rideCard}>
      <View style={s.rideLeft}>
        <View style={s.rideIconWrap}>
          <Feather name="navigation" size={16} color={colors.primary} />
        </View>
        <View style={s.rideInfo}>
          <Text style={s.rideFare}>{Number(ride.fare || 0).toLocaleString()} RWF</Text>
          <Text style={s.rideMeta}>
            {isToday(ride.createdAt)
              ? formatTime(ride.createdAt)
              : formatDate(ride.createdAt)}
            {ride.distance ? `  ·  ${ride.distance} km` : ""}
          </Text>
        </View>
      </View>
      <View style={s.rideRight}>
        <View style={[s.payBadge, ride.paymentMethod === "momo" && s.payBadgeMomo]}>
          <Feather
            name={ride.paymentMethod === "momo" ? "smartphone" : "dollar-sign"}
            size={12}
            color={ride.paymentMethod === "momo" ? colors.primary : colors.success}
          />
          <Text
            style={[
              s.payText,
              ride.paymentMethod === "momo" ? s.payTextMomo : s.payTextCash,
            ]}
          >
            {ride.paymentMethod === "momo" ? "MoMo" : "Cash"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, wide && s.headerWide, { paddingTop: wide ? 28 : insets.top || 16 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={[s.closeBtn, wide && s.closeBtnWide]}>
          <Feather name={wide ? "arrow-left" : "x"} size={wide ? 21 : 24} color={colors.textPrimary} />
        </TouchableOpacity>
        {wide ? (
          <>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={s.titleWide}>{t("pages.logride.title")}</Text>
              <Text style={s.subtitle}>{t("pages.logride.subtitle")}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={openForm} style={s.inlineAdd}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={s.fabText}>{t("pages.logride.add")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.title}>{t("pages.logride.title")}</Text>
            <View style={{ width: 44 }} />
          </>
        )}
      </View>

      {/* Rides List */}
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, wide && s.scrollContentWide]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 40) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {/* Summary */}
          <View style={s.stats}>
            <View style={s.stat}><Text style={s.statValue}>{todayRides.length}</Text><Text style={s.statLabel}>{t("pages.logride.rides_today")}</Text></View>
            <View style={s.stat}><Text style={[s.statValue, { color: colors.success }]}>{todayEarnings.toLocaleString()}</Text><Text style={s.statLabel}>{t("pages.logride.rwf_today")}</Text></View>
            <View style={s.stat}><Text style={s.statValue}>{allRides.length}</Text><Text style={s.statLabel}>{t("pages.logride.rides_logged")}</Text></View>
          </View>

          {/* Today's Rides */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{t("pages.logride.today")}</Text>
              <View style={s.countBadge}>
                <Text style={s.countText}>{todayRides.length}</Text>
              </View>
            </View>
            {todayRides.length === 0 ? (
              <View style={s.emptyCard}>
                <Feather name="clock" size={28} color={colors.textTertiary} />
                <Text style={s.emptyText}>{t("pages.logride.empty")}</Text>
                <Text style={s.emptySubText}>{t(wide ? "pages.logride.empty_hint_wide" : "pages.logride.empty_hint_tap")}</Text>
              </View>
            ) : (
              <View style={wide ? s.grid : undefined}>{todayRides.map((ride, index) => <View key={ride._id || `today-${ride.createdAt || index}`} style={wide ? s.gridItem : undefined}><RideCard ride={ride} /></View>)}</View>
            )}
          </View>

          {/* History */}
          {historyRides.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{t("pages.logride.history")}</Text>
                <View style={[s.countBadge, s.countBadgeGray]}>
                  <Text style={[s.countText, s.countTextGray]}>{historyRides.length}</Text>
                </View>
              </View>
              <View style={wide ? s.grid : undefined}>{historyRides.map((ride, index) => <View key={ride._id || `history-${ride.createdAt || index}`} style={wide ? s.gridItem : undefined}><RideCard ride={ride} /></View>)}</View>
              {loadingMore && (
                <ActivityIndicator
                  color={colors.primary}
                  style={{ marginVertical: 16 }}
                />
              )}
              {!hasMore && historyRides.length > 0 && (
                <Text style={s.endText}>{t("pages.logride.all_loaded")}</Text>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Log New Ride Button (phones; wide screens use the header button) */}
      {!wide ? (
        <TouchableOpacity
          style={[s.fab, { bottom: insets.bottom + 24 }]}
          onPress={openForm}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={s.fabText}>{t("pages.logride.add")}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Log Ride Modal */}
      <Modal
        visible={modalVisible}
        animationType={wide ? "fade" : "slide"}
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={[s.modalOverlay, wide && StyleSheet.absoluteFill]}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={wide ? s.modalCenter : s.modalSheet}
          pointerEvents="box-none"
        >
          <View style={[s.modalContent, wide && s.modalDialog, { paddingBottom: wide ? 28 : insets.bottom + 24 }]}>
            {/* Modal Handle */}
            {!wide ? <View style={s.handle} /> : null}

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t("pages.logride.add")}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={s.modalClose}
              >
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {paymentSuccess ? (
              <View style={s.successBox}>
                <Feather name="check-circle" size={64} color={colors.success} />
                <Text style={[s.modalTitle, { marginTop: 16 }]}>{t("pages.logride.paid_title")}</Text>
                <Text style={s.label}>{t("pages.logride.paid_body")}</Text>
              </View>
            ) : paymentWaiting ? (
              <View style={s.successBox}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[s.modalTitle, { marginTop: 16 }]}>{t("pages.logride.waiting_title")}</Text>
                <Text style={s.label}>{t("pages.logride.waiting_body")}</Text>

                <TouchableOpacity
                  style={[s.submitBtn, { backgroundColor: colors.error, marginTop: 32 }]}
                  onPress={cancelStream}
                >
                  <Text style={s.submitText}>{t("pages.logride.cancel_waiting")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Fare */}
                <Text style={s.label}>{t("fare")} (RWF)</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. 1500"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  value={fare}
                  onChangeText={setFare}
                  autoFocus
                />

                {/* Passenger Phone */}
                <Text style={[s.label, { marginTop: 20 }]}>{t("pages.logride.passenger_phone")}</Text>
                <RwandaPhoneInput value={passengerPhone} onChangeText={setPassengerPhone} accessibilityLabel="Passenger phone number" />

                {/* Payment Method — MoMo only */}
                <Text style={[s.label, { marginTop: 20 }]}>{t("payment_method")}</Text>
                <View style={s.momoBadge}>
                  <Feather name="smartphone" size={20} color={colors.primary} />
                  <Text style={s.momoText}>MoMo</Text>
                  <Feather name="check-circle" size={16} color={colors.primary} />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={s.submitBtn}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.submitText}>{t("pages.logride.save")}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
    section: { marginBottom: 28 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    countBadge: {
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    countBadgeGray: {
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    },
    countText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    countTextGray: {
      color: colors.textSecondary,
    },
    emptyCard: {
      alignItems: "center",
      padding: 28,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      gap: 6,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginTop: 4,
    },
    emptySubText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    rideCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rideLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rideIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: `${colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    rideInfo: { flex: 1 },
    rideFare: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    rideMeta: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginTop: 2,
    },
    rideRight: { alignItems: "flex-end" },
    payBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
    },
    payBadgeMomo: {
      backgroundColor: `${colors.primary}12`,
    },
    payText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
    payTextMomo: { color: colors.primary },
    payTextCash: { color: colors.success },
    endText: {
      textAlign: "center",
      fontSize: 12,
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      marginTop: 8,
    },
    // FAB
    fab: {
      position: "absolute",
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 30,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
    },
    // Wide browsers
    headerWide: { gap: 14, paddingHorizontal: 28, paddingBottom: 20, justifyContent: "flex-start" },
    closeBtnWide: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundCard },
    titleWide: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.textPrimary },
    subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 2 },
    inlineAdd: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, paddingHorizontal: 18, height: 46, borderRadius: 14 },
    scrollContentWide: { paddingHorizontal: 28, paddingTop: 24 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    gridItem: { flexGrow: 1, flexBasis: 300, maxWidth: "50%" },
    modalCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 24 },
    modalDialog: { width: "100%", maxWidth: 480, borderRadius: 24, borderWidth: 1, paddingTop: 22 },
    stats: { flexDirection: "row", gap: 10, marginBottom: 20 },
    stat: { flex: 1, backgroundColor: colors.backgroundCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 12 },
    statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.textPrimary },
    statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginTop: 2 },
    fabText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    modalSheet: {
      backgroundColor: "transparent",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    modalClose: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 16,
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    momoBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${colors.primary}12`,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    momoText: {
      flex: 1,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 24,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    submitText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    successBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
    },
  });
