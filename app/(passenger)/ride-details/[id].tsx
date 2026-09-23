import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { ridesApi } from "@/services/api";
import { OpenStreetMapView } from "@/components/OpenStreetMapView";
import { PassengerCard, PassengerHeader } from "@/components/passenger/PassengerUI";

const cancellable = ["requested", "searching", "accepted", "approaching", "arrived"];
const coordinate = (location: any) => location?.latitude != null || location?.lat != null
  ? { latitude: Number(location.latitude ?? location.lat), longitude: Number(location.longitude ?? location.lng) }
  : null;
const locationName = (value: any, fallback: string) => value?.name || value?.address || fallback;
const personName = (person: any, fallback: string) => person ? [person.firstName, person.lastName].filter(Boolean).join(" ") || fallback : fallback;
const dateTime = (value?: string) => value ? new Date(value).toLocaleString() : "—";

export default function PassengerRideDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const t = useT();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: ride, isLoading, refetch } = useQuery({
    queryKey: ["passenger_ride", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await ridesApi.getRideDetails(id);
      return response.data?.data?.ride || response.data?.ride || response.data?.data || response.data;
    },
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!ride) return <View style={styles.center}><Text style={{ color: colors.textPrimary }}>{t("ride.try_again")}</Text></View>;

  const status = ride.rideStatus || ride.status || "requested";
  const pickup = coordinate(ride.pickup);
  const destination = coordinate(ride.destination);
  const driver = ride.driver || ride.driverId;
  const fare = Number(ride.fare || ride.offeredFare || 0);
  const scheduled = ride.scheduledDate ? `${ride.scheduledDate} ${ride.scheduledTime || ""}`.trim() : null;

  const cancelRide = () => Alert.alert(
    t("ride.cancel_request"),
    t("ride.cancel_request"),
    [{ text: t("cancel"), style: "cancel" }, { text: t("confirm"), style: "destructive", onPress: async () => {
      setSaving(true);
      try { await ridesApi.cancelRide(id); await refetch(); await queryClient.invalidateQueries({ queryKey: ["passenger_rides"] }); }
      catch (error: any) { Alert.alert(t("error"), error?.response?.data?.message || t("ride.try_again")); }
      finally { setSaving(false); }
    }}],
  );
  const submitRating = async () => {
    setSaving(true);
    try {
      await ridesApi.rateRide(id, { rating, comment: comment.trim() || undefined });
      Alert.alert(t("ride.thank_you"), t("ride.feedback_saved"));
      await refetch();
    } catch (error: any) { Alert.alert(t("ride.unable_feedback"), error?.response?.data?.message || t("ride.try_again")); }
    finally { setSaving(false); }
  };
  const info = [
    [t("ride.pickup"), locationName(ride.pickup, t("ride.pickup"))],
    [t("ride.destination"), locationName(ride.destination, t("ride.destination"))],
    [t("ride.price"), `${fare.toLocaleString()} RWF`],
    [t("ride.distance"), `${ride.estimatedDistanceKm ?? "—"} km`],
    [t("ride.duration"), `${ride.estimatedDurationMin ?? "—"} min`],
    [t("ride.passengers"), String(ride.passengers || 1)],
    [t("ride.payment"), `${ride.paymentMethod || "wallet"} · ${ride.paymentStatus || "pending"}`],
    [t("ride.requested"), dateTime(ride.requestedAt || ride.createdAt)],
    [t("ride.scheduled"), scheduled || "—"],
  ];

  return <View style={[styles.page, { backgroundColor: colors.background, paddingTop: insets.top }]}>
    <View style={styles.header}><PassengerHeader title={t("ride.details")} subtitle={t("ride.details_help")} /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {pickup ? <View style={styles.map}><OpenStreetMapView center={pickup} destination={destination} route={destination ? [pickup, destination] : []} drivers={driver?.lastLocation ? [{ latitude: driver.lastLocation.latitude, longitude: driver.lastLocation.longitude, label: personName(driver, t("ride.driver")) }] : []} /></View> : null}
      <PassengerCard>
        <Text style={[styles.status, { color: colors.primary }]}>{String(status).replaceAll("_", " ").toUpperCase()}</Text>
        {info.map(([label, value]) => <View key={label} style={[styles.infoRow, { borderBottomColor: colors.border }]}><Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text></View>)}
      </PassengerCard>
      <PassengerCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t("ride.driver")}</Text>
        <View style={styles.personRow}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Feather name="user" size={23} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.personName, { color: colors.textPrimary }]}>{personName(driver, t("ride.not_assigned"))}</Text><Text style={[styles.personMeta, { color: colors.textSecondary }]}>{driver?.vehicleColor || ""} {[driver?.vehicleMake, driver?.vehicleModel].filter(Boolean).join(" ")}</Text></View></View>
        <View style={styles.detailGrid}><Detail label={t("ride.phone")} value={driver?.phone || "—"} /><Detail label={t("ride.plate")} value={driver?.plate || "—"} /></View>
      </PassengerCard>
      {ride.passengerComment || ride.driverComment ? <PassengerCard><Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t("ride.feedback_optional")}</Text>{ride.passengerComment ? <Text style={{ color: colors.textSecondary }}>{ride.passengerComment}</Text> : null}{ride.driverComment ? <Text style={{ color: colors.textSecondary }}>{ride.driverComment}</Text> : null}</PassengerCard> : null}
      {cancellable.includes(status) ? <TouchableOpacity disabled={saving} style={styles.cancel} onPress={cancelRide}><Text style={styles.cancelText}>{saving ? t("ride.updating") : t("ride.cancel_request")}</Text></TouchableOpacity> : null}
      {status === "completed" ? <PassengerCard><Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t("ride.rate")}</Text><View style={styles.stars}>{[1,2,3,4,5].map((value) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${value} stars`} key={value} onPress={() => setRating(value)}><Feather name="star" size={28} color={value <= rating ? "#F59E0B" : colors.border} /></TouchableOpacity>)}</View><TextInput value={comment} onChangeText={setComment} placeholder={t("ride.feedback_optional")} placeholderTextColor={colors.textSecondary} multiline style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} /><TouchableOpacity disabled={saving} style={[styles.primary, { backgroundColor: colors.primary }]} onPress={submitRating}><Text style={styles.primaryText}>{saving ? t("ride.saving") : t("ride.submit_feedback")}</Text></TouchableOpacity></PassengerCard> : null}
    </ScrollView>
  </View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return <View style={[styles.detail, { backgroundColor: colors.backgroundElevated }]}><Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, header: { paddingHorizontal: 16 },
  content: { padding: 16, paddingBottom: 70, gap: 14 }, map: { height: 280, borderRadius: 22, overflow: "hidden" },
  status: { fontFamily: "Inter_700Bold", marginBottom: 8 }, infoRow: { paddingVertical: 10, borderBottomWidth: 1 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" }, value: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 14 }, personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, personName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  personMeta: { fontSize: 12, marginTop: 3 }, detailGrid: { flexDirection: "row", gap: 10, marginTop: 14 }, detail: { flex: 1, borderRadius: 14, padding: 12 },
  cancel: { padding: 15, borderRadius: 14, backgroundColor: "#FEE2E2", alignItems: "center" }, cancelText: { color: "#B91C1C", fontFamily: "Inter_700Bold" },
  stars: { flexDirection: "row", gap: 10, marginBottom: 16 }, input: { borderWidth: 1, borderRadius: 14, minHeight: 90, padding: 12, textAlignVertical: "top" },
  primary: { padding: 15, borderRadius: 14, alignItems: "center", marginTop: 12 }, primaryText: { color: "#fff", fontFamily: "Inter_700Bold" },
});
