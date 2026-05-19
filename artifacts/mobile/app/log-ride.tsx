import React, { useState, useCallback } from "react";
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

import EventSource from "react-native-sse";

import { driverApi, algorithmApi, getStoredToken, API_BASE_URL } from "@/services/api";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";

type Ride = {
  _id: string;
  fare: number;
  distance?: number;
  pickupLocation?: string;
  dropoffLocation?: string;
  paymentMethod?: string;
  createdAt: string;
};

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
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
    staleTime: 30000,
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
    } catch {}
    setLoadingMore(false);
  };

  // Split rides into today vs history
  const todayRides = allRides.filter((r) => isToday(r.createdAt));
  const historyRides = allRides.filter((r) => !isToday(r.createdAt));

  // Submit new ride
  const handleSubmit = async () => {
    if (!fare) {
      alert("Please enter the fare amount");
      return;
    }
    setSubmitting(true);
    setPaymentWaiting(false);
    setPaymentSuccess(false);
    try {
      const res = await driverApi.logRide({
        fare: Number(fare),
        passengerPhone: passengerPhone,
        distance: 0,
        pickupLocation: "",
        dropoffLocation: "",
        paymentMethod: "momo",
      });
      const ref = res.data?.paypackRef || res.data?.data?.paypackRef || res.data?.ref || res.data?.data?.ref;

      if (ref) {
        setPaymentWaiting(true);
        const token = await getStoredToken();
        const es = new EventSource(`${API_BASE_URL}/payment/status-stream/${ref}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        es.addEventListener('message', async (event) => {
            if (!event.data) return;
            try {
              const data = JSON.parse(event.data);
              if (data.status === 'completed' || data.status === 'successful') {
                  es.close();
                  setPaymentWaiting(false);
                  setPaymentSuccess(true);
                  try { await algorithmApi.completeRide(); } catch {}
                  
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
              } else if (data.status === 'failed') {
                  es.close();
                  setPaymentWaiting(false);
                  alert("Payment failed. Passenger may have declined.");
                  setSubmitting(false);
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
        });

        es.addEventListener('error', (err) => {
            console.error("Stream disconnected", err);
        });

      } else {
        // Fallback without SSE
        try { await algorithmApi.completeRide(); } catch {}
        setFare("");
        setPassengerPhone("");
        setModalVisible(false);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["rider_status"] });
        queryClient.invalidateQueries({ queryKey: ["rider_earnings"] });
        setSubmitting(false);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to log ride");
      setSubmitting(false);
    }
  };

  const s = styles(colors, isDark);

  const RideCard = ({ ride }: { ride: Ride }) => (
    <View style={s.rideCard}>
      <View style={s.rideLeft}>
        <View style={s.rideIconWrap}>
          <Feather name="navigation" size={16} color={colors.primary} />
        </View>
        <View style={s.rideInfo}>
          <Text style={s.rideFare}>{ride.fare.toLocaleString()} RWF</Text>
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
      <View style={[s.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>My Rides</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Rides List */}
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
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
          {/* Today's Rides */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Today</Text>
              <View style={s.countBadge}>
                <Text style={s.countText}>{todayRides.length}</Text>
              </View>
            </View>
            {todayRides.length === 0 ? (
              <View style={s.emptyCard}>
                <Feather name="clock" size={28} color={colors.textTertiary} />
                <Text style={s.emptyText}>No rides logged today yet</Text>
                <Text style={s.emptySubText}>Tap "+ Log New Ride" to add one</Text>
              </View>
            ) : (
              todayRides.map((ride) => <RideCard key={ride._id} ride={ride} />)
            )}
          </View>

          {/* History */}
          {historyRides.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>History</Text>
                <View style={[s.countBadge, s.countBadgeGray]}>
                  <Text style={[s.countText, s.countTextGray]}>{historyRides.length}</Text>
                </View>
              </View>
              {historyRides.map((ride) => <RideCard key={ride._id} ride={ride} />)}
              {loadingMore && (
                <ActivityIndicator
                  color={colors.primary}
                  style={{ marginVertical: 16 }}
                />
              )}
              {!hasMore && historyRides.length > 0 && (
                <Text style={s.endText}>All rides loaded</Text>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Log New Ride Button */}
      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => {
          setFare("");
          setPassengerPhone("");
          setModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={20} color="#fff" />
        <Text style={s.fabText}>Log New Ride</Text>
      </TouchableOpacity>

      {/* Log Ride Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalSheet}
        >
          <View style={[s.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            {/* Modal Handle */}
            <View style={s.handle} />

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Log New Ride</Text>
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
                <Text style={[s.modalTitle, { marginTop: 16 }]}>Payment Successful!</Text>
                <Text style={s.label}>Passenger has completed the payment.</Text>
              </View>
            ) : paymentWaiting ? (
              <View style={s.successBox}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[s.modalTitle, { marginTop: 16 }]}>Waiting for Passenger</Text>
                <Text style={s.label}>Waiting for passenger to enter PIN...</Text>
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
                <Text style={[s.label, { marginTop: 20 }]}>Passenger Phone Number</Text>
                <TextInput
                  style={s.input}
                  placeholder="078..."
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  value={passengerPhone}
                  onChangeText={setPassengerPhone}
                />

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
                    <Text style={s.submitText}>Save Ride</Text>
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
