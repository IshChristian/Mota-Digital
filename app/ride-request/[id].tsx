import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { RideMap } from "@/components/RideMap";
import { ridesApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { DriverButton, DriverCard, DriverHeader, DriverScreen, Metric, StatusPill } from "@/components/driver/DriverUI";

const coordinate = (location: any) => location?.latitude != null || location?.lat != null
  ? { latitude: Number(location.latitude ?? location.lat), longitude: Number(location.longitude ?? location.lng) }
  : undefined;
const name = (person: any, fallback: string) => person ? [person.firstName, person.lastName].filter(Boolean).join(" ") || fallback : fallback;
const place = (location: any, fallback: string) => location?.name || location?.address || fallback;

export default function RideRequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const t = useT();
  const [submitting, setSubmitting] = useState(false);
  const query = useQuery({
    queryKey: ["ride-request", id],
    queryFn: async () => {
      const response = await ridesApi.getRideDetails(id);
      return response.data?.data?.ride || response.data?.ride || response.data;
    },
    enabled: Boolean(id),
  });
  const ride: any = query.data;
  const pickup = coordinate(ride?.pickup);
  const destination = coordinate(ride?.destination);
  const passenger = ride?.passenger || ride?.passengerId;
  const scheduled = ride?.scheduledDate ? `${ride.scheduledDate} ${ride.scheduledTime || ""}`.trim() : "—";

  const act = async (accept: boolean) => {
    setSubmitting(true);
    try {
      if (accept) {
        await ridesApi.acceptRide(id);
        router.replace({ pathname: "/active-ride", params: { rideId: id } } as any);
      } else {
        await ridesApi.declineRide(id);
        router.back();
      }
    } catch (error: any) {
      try {
        const current = (await ridesApi.getRideStatus(id)).data;
        if (current?.driverId && ["accepted","approaching","arrived","start_requested","in_progress","stop_requested","awaiting_payment"].includes(current.rideStatus)) {
          router.replace({ pathname: "/active-ride", params: { rideId: id } } as any);
          return;
        }
      } catch { /* Keep the original actionable error. */ }
      Alert.alert(t("ride.details"), error.response?.data?.message || t("ride.try_again"));
      void query.refetch();
    } finally { setSubmitting(false); }
  };

  if (query.isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!ride) return <View style={styles.center}><Text style={{ color: colors.textPrimary }}>{t("ride.try_again")}</Text></View>;
  return (
    <DriverScreen scroll>
      <DriverHeader title={t("ride.details")} subtitle={t("ride.details_help")} back />
      <View style={styles.statusRow}><StatusPill label={String(ride.rideStatus || ride.status || "requested").replaceAll("_", " ")} tone="warning" /><Text style={[styles.fare, { color: colors.primary }]}>{Number(ride.fare || ride.offeredFare || 0).toLocaleString()} RWF</Text></View>
      {pickup ? <DriverCard style={styles.mapCard}><View style={styles.map}><RideMap center={pickup} pickup={pickup} destination={destination} /></View></DriverCard> : null}
      <DriverCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t("ride.passenger_info")}</Text>
        <View style={styles.personRow}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Feather name="user" size={23} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.personName, { color: colors.textPrimary }]}>{name(passenger, t("ride.passenger"))}</Text><Text style={[styles.personMeta, { color: colors.textSecondary }]}>{passenger?.phone || t("ride.phone_after_accept")}</Text></View></View>
      </DriverCard>
      <DriverCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t("ride.details")}</Text>
        <View style={styles.route}><View style={styles.rail}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><View style={[styles.line, { backgroundColor: colors.border }]} /><View style={[styles.dot, { backgroundColor: colors.success }]} /></View><View style={{ flex: 1, gap: 18 }}><Info label={t("ride.pickup")} value={place(ride.pickup, t("ride.pickup"))} /><Info label={t("ride.destination")} value={place(ride.destination, t("ride.destination"))} /></View></View>
        <View style={[styles.metrics, { borderTopColor: colors.border }]}>
          <Metric label={t("ride.distance")} value={`${ride.estimatedDistanceKm ?? "—"} km`} icon="navigation" />
          <Metric label={t("ride.duration")} value={`${ride.estimatedDurationMin ?? "—"} min`} icon="clock" />
          <Metric label={t("ride.passengers")} value={String(ride.passengers || 1)} icon="users" />
        </View>
        <View style={styles.detailGrid}><Info label={t("ride.requested")} value={ride.requestedAt || ride.createdAt ? new Date(ride.requestedAt || ride.createdAt).toLocaleString() : "—"} /><Info label={t("ride.scheduled")} value={scheduled} /><Info label={t("ride.payment")} value={ride.paymentMethod || "wallet"} /></View>
      </DriverCard>
      <View style={styles.actions}><View style={{ flex: 1 }}><DriverButton label={t("ride.decline")} variant="secondary" disabled={submitting} onPress={() => void act(false)} /></View><View style={{ flex: 1 }}><DriverButton label={submitting ? t("ride.working") : t("ride.accept")} loading={submitting} onPress={() => void act(true)} /></View></View>
    </DriverScreen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return <View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" }, statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fare: { fontSize: 24, fontFamily: "Inter_700Bold" }, mapCard: { padding: 0, overflow: "hidden" }, map: { height: 310 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 14 }, personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, personName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  personMeta: { fontSize: 12, marginTop: 3 }, route: { flexDirection: "row" }, rail: { width: 20, alignItems: "center", marginRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 }, line: { width: 2, flex: 1, minHeight: 40 }, label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  value: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 }, metrics: { flexDirection: "row", borderTopWidth: 1, marginTop: 18, paddingTop: 16 },
  detailGrid: { gap: 12, marginTop: 18 }, actions: { flexDirection: "row", gap: 12 },
});
