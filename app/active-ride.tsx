import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { Alert } from "@/components/GlobalAlert";
import { ridesApi, productionApi, mapsApi, getApiErrorMessage, type RouteResult } from "@/services/api";
import { NextTurn } from "@/components/passenger/ride/DirectionsList";
import { decodePolyline } from "@/utils/geo";
import { useRealtimeEvent, useRealtimeStatus } from "@/hooks/useRealtime";
import { haversineKm } from "@/utils/geo";
import { MapCanvas } from "@/components/passenger/ride/MapCanvas";
import { rideStyles } from "@/components/passenger/ride/rideStyles";
import type { RideView } from "@/hooks/usePassengerRide";

type DriverRide = RideView & { driverEarning?: number; commissionAmount?: number; passenger?: { firstName: string; rating?: number; avatarUrl?: string } };
type Point = { latitude: number; longitude: number };

const TITLES: Record<string, string> = {
  accepted: "drive.to_pickup", approaching: "drive.to_pickup", arrived: "drive.at_pickup", start_requested: "drive.waiting_passenger",
  in_progress: "drive.to_destination", stop_requested: "drive.waiting_passenger", awaiting_payment: "drive.collect_payment",
  completed: "drive.trip_complete", cancelled: "drive.ride_cancelled", expired: "drive.ride_expired",
};

export default function ActiveRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const [ride, setRide] = useState<DriverRide | null>(null);
  const [loadError, setLoadError] = useState("");
  const [me, setMe] = useState<Point | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [deliveryPin, setDeliveryPin] = useState("");
  const [rating, setRating] = useState(0);
  const live = useRealtimeStatus() === "connected";

  const load = async () => {
    if (!rideId) return;
    try { setRide((await ridesApi.getRideDetails(rideId)).data?.data?.ride ?? null); setLoadError(""); }
    catch (e) { setLoadError(getApiErrorMessage(e)); }
  };
  useEffect(() => { void load(); }, [rideId]);
  useEffect(() => {
    if (!ride || ["completed", "cancelled", "expired"].includes(ride.rideStatus)) return;
    const timer = setInterval(load, live ? 20_000 : 4_000);
    return () => clearInterval(timer);
  }, [ride?.rideStatus, live]);
  useRealtimeEvent("rideUpdate", (d) => { if (String(d?.rideId) === String(rideId)) void load(); });
  useRealtimeEvent("paymentUpdate", (d) => { if (String(d?.rideId) === String(rideId)) void load(); });

  // On-screen position only; the background location service reports to the server.
  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10 }, (l) => setMe({ latitude: l.coords.latitude, longitude: l.coords.longitude }))
      .then((x) => { sub = x; }).catch(() => {});
    return () => sub?.remove();
  }, []);

  // Road route from the driver to the current target; refreshed when the leg
  // changes or the driver has moved ~300 m from where it was computed.
  const [route, setRoute] = useState<RouteResult | null>(null);
  const routedFrom = useRef<{ latitude: number; longitude: number; leg: string } | null>(null);
  useEffect(() => {
    if (!ride || !me) return;
    const leg = ["accepted", "approaching", "arrived", "start_requested"].includes(ride.rideStatus) ? "pickup" : "destination";
    if (["completed", "cancelled", "expired", "awaiting_payment"].includes(ride.rideStatus)) { setRoute(null); return; }
    const last = routedFrom.current;
    if (last && last.leg === leg && haversineKm(last, me) < 0.3) return;
    routedFrom.current = { ...me, leg };
    mapsApi.getRoute(me, leg === "pickup" ? ride.pickup : ride.destination).then((r) => setRoute(r.data.data)).catch(() => setRoute(null));
  }, [ride?.rideStatus, me?.latitude, me?.longitude]);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); await load(); }
    catch (e) { Alert.alert(t("drive.action_failed"), getApiErrorMessage(e)); }
    finally { setBusy(null); }
  };

  if (!ride) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {loadError ? <><Text style={s.error}>{loadError}</Text><TouchableOpacity style={[s.secondaryBtn, { marginTop: 16 }]} onPress={load}><Text style={s.secondaryText}>{t("drive.retry")}</Text></TouchableOpacity></> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const status = ride.rideStatus;
  const toPickup = ["accepted", "approaching", "arrived", "start_requested"].includes(status);
  const target = toPickup ? ride.pickup : ride.destination;
  const kmToPickup = me ? haversineKm(me, ride.pickup) : null;
  const isParcel = ride.rideType === "parcel";
  const finished = ["completed", "cancelled", "expired"].includes(status);

  const navigate = () => {
    const { latitude, longitude } = target;
    const url = Platform.select({
      ios: `maps:0,0?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`));
  };
  const call = () => act("call", async () => {
    const res = await ridesApi.call(ride._id);
    if (res.data.data.mode === "direct" && res.data.data.phone) await Linking.openURL(`tel:+${res.data.data.phone.replace(/^\+/, "")}`);
    else Alert.alert(t("drive.connecting_call"), res.data.data.message || t("drive.answer_call"));
  });
  const sos = () => Alert.alert(t("drive.sos_q"), t("drive.sos_body"), [
    { text: t("cancel"), style: "cancel" },
    { text: t("drive.send_sos"), style: "destructive", onPress: () => void act("sos", () => productionApi.createSafetyEvent({ rideId: ride._id, type: "sos", category: "driver", location: me ? { ...me, capturedAt: new Date().toISOString() } : undefined })) },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ height: "42%" }}>
        <MapCanvas center={me ?? target} destination={target} route={route?.encodedPolyline ? decodePolyline(route.encodedPolyline) : me && !finished ? [me, target] : []} drivers={me ? [{ ...me, label: t("drive.you") }] : []} />
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("drive.back")} onPress={() => router.back()} style={[styles.round, { backgroundColor: colors.backgroundCard }]}><Feather name="arrow-left" size={20} color={colors.textPrimary} /></TouchableOpacity>
          <View style={{ flex: 1 }} />
          {!finished ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="SOS" onPress={sos} style={[styles.round, { backgroundColor: colors.error, width: 64 }]}><Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>SOS</Text></TouchableOpacity> : null}
        </View>
        {!finished ? (
          <TouchableOpacity accessibilityRole="button" onPress={navigate} style={[styles.navBtn, { backgroundColor: colors.primary }]}>
            <Feather name="navigation" size={16} color="#fff" /><Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>{t(toPickup ? "drive.navigate_pickup" : isParcel ? "drive.navigate_dropoff" : "drive.navigate_destination")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Text accessibilityLiveRegion="polite" style={s.title}>{TITLES[status] ? t(TITLES[status]) : status}</Text>
        {route && !finished && status !== "awaiting_payment" ? <NextTurn route={route} /> : null}
        <View style={[s.card, s.row]}>
          <View style={s.iconBubble}><Feather name={isParcel ? "package" : "user"} size={18} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.body}>{ride.passenger?.firstName || t("drive.passenger")}{ride.passenger?.rating ? ` · ★ ${ride.passenger.rating.toFixed(1)}` : ""}</Text>
            <Text style={s.subtitle} numberOfLines={2}>{toPickup ? t("drive.pickup_label", { place: ride.pickup.name }) : t(isParcel ? "drive.deliver_to" : "drive.to_place", { place: ride.destination.name })}</Text>
            {isParcel && ride.parcel ? <Text style={s.subtitle}>{t("drive.recipient", { name: ride.parcel.recipientName })} · {ride.parcel.size}{ride.parcel.description ? ` · ${ride.parcel.description}` : ""}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.body, { fontFamily: "Inter_700Bold" }]}>{ride.fare.toLocaleString()} RWF</Text>
            <Text style={s.subtitle}>{t(ride.paymentMethod === "cash" ? "drive.cash" : ride.paymentMethod === "momo" ? "drive.momo" : "drive.wallet")}</Text>
          </View>
        </View>

        {!finished ? (
          <View style={s.row}>
            <TouchableOpacity accessibilityRole="button" onPress={call} disabled={!!busy} style={[s.secondaryBtn, { flex: 1 }]}>{busy === "call" ? <ActivityIndicator color={colors.primary} /> : <Feather name="phone" size={18} color={colors.primary} />}<Text style={s.secondaryText}>{t("drive.call")}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: "/ride-chat/[id]", params: { id: ride._id, name: ride.passenger?.firstName || t("drive.passenger") } } as any)} style={[s.secondaryBtn, { flex: 1 }]}><Feather name="message-circle" size={18} color={colors.primary} /><Text style={s.secondaryText}>{t("drive.chat")}</Text></TouchableOpacity>
          </View>
        ) : null}

        {(status === "accepted" || status === "approaching") ? (
          <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => act("arrive", () => ridesApi.notifyArrival(ride._id))} style={s.primaryBtn}>
            {busy === "arrive" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("drive.arrived")}{kmToPickup != null && kmToPickup > 2 ? ` · ${t("drive.km_away", { km: kmToPickup.toFixed(1) })}` : ""}</Text>}
          </TouchableOpacity>
        ) : null}

        {(status === "arrived" || status === "start_requested") ? (
          <View style={{ gap: 10 }}>
            {status === "arrived" ? (
              <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => act("reqStart", () => ridesApi.requestStart(ride._id))} style={s.primaryBtn}>
                {busy === "reqStart" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("drive.ask_start")}</Text>}
              </TouchableOpacity>
            ) : <View style={[s.card, s.row]}><ActivityIndicator color={colors.primary} /><Text style={s.body}>{t("drive.waiting_start")}</Text></View>}
            <Text style={s.subtitle}>{t("drive.or_pin")}</Text>
            <View style={s.row}>
              <View style={[s.inputBox, { flex: 1 }]}><TextInput style={[s.input, { letterSpacing: 8, fontSize: 20 }]} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="••••" placeholderTextColor={colors.textTertiary} accessibilityLabel={t("drive.pin")} /></View>
              <TouchableOpacity disabled={pin.length !== 4 || !!busy} onPress={() => act("pin", () => ridesApi.startRide(ride._id, pin))} style={[s.primaryBtn, { paddingHorizontal: 20 }, pin.length !== 4 && { opacity: 0.5 }]}>{busy === "pin" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("drive.start")}</Text>}</TouchableOpacity>
            </View>
          </View>
        ) : null}

        {status === "in_progress" ? (
          <View style={{ gap: 10 }}>
            {isParcel ? (
              <>
                <Text style={s.subtitle}>{t("drive.ask_code")}</Text>
                <View style={s.inputBox}><TextInput style={[s.input, { letterSpacing: 8, fontSize: 20 }]} value={deliveryPin} onChangeText={(v) => setDeliveryPin(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder={t("drive.delivery_code")} placeholderTextColor={colors.textTertiary} accessibilityLabel={t("drive.delivery_code")} /></View>
              </>
            ) : null}
            <TouchableOpacity accessibilityRole="button" disabled={!!busy || (isParcel && deliveryPin.length !== 4)} onPress={() => act("stop", () => ridesApi.requestStop(ride._id, isParcel ? deliveryPin : undefined))} style={[s.primaryBtn, isParcel && deliveryPin.length !== 4 && { opacity: 0.5 }]}>
              {busy === "stop" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t(isParcel ? "drive.confirm_delivery" : "drive.end_ride")}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {status === "stop_requested" ? <View style={[s.card, s.row]}><ActivityIndicator color={colors.primary} /><Text style={[s.body, { flex: 1 }]}>{t("drive.waiting_arrival")}</Text></View> : null}

        {status === "awaiting_payment" ? (
          ride.paymentStatus === "successful" ? (
            <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => act("claim", () => ridesApi.claimFare(ride._id))} style={s.primaryBtn}>
              {busy === "claim" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("drive.payment_received_finish")}</Text>}
            </TouchableOpacity>
          ) : ride.paymentMethod === "cash" ? (
            <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => act("cash", () => ridesApi.claimFare(ride._id))} style={s.primaryBtn}>
              {busy === "cash" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("drive.received_cash", { amount: ride.fare.toLocaleString() })}</Text>}
            </TouchableOpacity>
          ) : ride.paymentStatus === "failed" ? (
            <View style={s.card}><Text style={s.body}>{t("drive.payment_failed")}</Text></View>
          ) : <View style={[s.card, s.row]}><ActivityIndicator color={colors.primary} /><Text style={[s.body, { flex: 1 }]}>{t("drive.waiting_payment")}</Text></View>
        ) : null}

        {status === "completed" ? (
          <View style={{ gap: 12 }}>
            <View style={s.card}>
              <Text style={s.subtitle}>{t("drive.your_earning")}</Text>
              <Text style={[s.title, { color: colors.success }]}>{(Number(ride.driverEarning ?? ride.fare) + Number(ride.tipAmount || 0)).toLocaleString()} RWF</Text>
              <Text style={s.subtitle}>{t("drive.earning_detail", { fare: ride.fare.toLocaleString(), commission: Number(ride.commissionAmount || 0).toLocaleString() })}{ride.tipAmount ? ` · ${t("drive.tip", { tip: ride.tipAmount.toLocaleString() })}` : ""}{ride.paymentMethod === "cash" ? ` · ${t("drive.cash_commission_note")}` : ""}</Text>
            </View>
            <Text style={s.label}>{t("drive.rate_passenger")}</Text>
            <View style={[s.row, { justifyContent: "center" }]}>
              {[1, 2, 3, 4, 5].map((n) => <TouchableOpacity key={n} accessibilityLabel={`${n} stars`} onPress={() => { setRating(n); void act("rate", () => ridesApi.rateRide(ride._id, { rating: n })); }} style={{ padding: 6 }}><Feather name="star" size={30} color={n <= rating ? "#F59E0B" : colors.border} /></TouchableOpacity>)}
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace("/(driver)" as any)}><Text style={s.primaryText}>{t("drive.back_dashboard")}</Text></TouchableOpacity>
          </View>
        ) : null}
        {status === "cancelled" || status === "expired" ? (
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace("/(driver)" as any)}><Text style={s.primaryText}>{t("drive.back_dashboard")}</Text></TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  topBar: { position: "absolute", left: 16, right: 16, flexDirection: "row" },
  round: { height: 44, minWidth: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6 },
  navBtn: { position: "absolute", bottom: 14, alignSelf: "center", flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 18, height: 46, borderRadius: 23, elevation: 4 },
});
