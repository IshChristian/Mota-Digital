import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { Alert } from "@/components/GlobalAlert";
import { ridesApi, realtimeApi, walletApi, productionApi, placesApi, mapsApi, getApiErrorMessage, type FareOption, type Place, type RouteResult } from "@/services/api";
import { formatPlace } from "@/utils/formatPlace";
import { decodePolyline } from "@/utils/geo";
import { kigaliParts } from "@/utils/kigaliTime";
import { usePassengerRide } from "@/hooks/usePassengerRide";
import { MapCanvas } from "@/components/passenger/ride/MapCanvas";
import { WhereToPanel } from "@/components/passenger/ride/WhereToPanel";
import { TripOptionsPanel, type TripChoice } from "@/components/passenger/ride/TripOptionsPanel";
import { SearchingPanel } from "@/components/passenger/ride/SearchingPanel";
import { TripPanel } from "@/components/passenger/ride/TripPanel";
import { CancelSheet, RatingSheet, SosSheet } from "@/components/passenger/ride/RideModals";

const KIGALI = { latitude: -1.9536, longitude: 30.0606 };
type Point = { latitude: number; longitude: number };

export default function PassengerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const trip = usePassengerRide();
  const ride = trip.ride;

  // ─── Where the passenger is and wants to go ────────────────────────────────
  const [gps, setGps] = useState<Point | null>(null);
  const [gpsName, setGpsName] = useState(t("trip.current_location"));
  const [locationIssue, setLocationIssue] = useState<"" | "denied" | "off">("");
  const [pickupOverride, setPickupOverride] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [rideType, setRideType] = useState<"ride" | "parcel">("ride");
  const pickup: Place = pickupOverride ?? { name: gpsName, ...(gps ?? KIGALI) };

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let named = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLocationIssue("denied"); return; }
      if (!(await Location.hasServicesEnabledAsync())) setLocationIssue("off");
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 20 }, async (loc) => {
        setLocationIssue("");
        const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setGps(point);
        if (!named) {
          named = true;
          try { const [g] = await Location.reverseGeocodeAsync(point); if (g) setGpsName(formatPlace(g, t("trip.current_location"))); } catch { /* keep generic name */ }
        }
      });
    })().catch(() => setLocationIssue("off"));
    return () => sub?.remove();
  }, []);

  // ─── Prices for every vehicle once a destination is chosen ─────────────────
  const [options, setOptions] = useState<FareOption[] | null>(null);
  const [optionsError, setOptionsError] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  // Road route for the map line and turn-by-turn directions (Google, else OpenStreetMap).
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  useEffect(() => {
    setRouteInfo(null);
    if (!destination) return;
    let active = true;
    mapsApi.getRoute(pickup, destination).then((res) => active && setRouteInfo(res.data.data)).catch(() => {});
    return () => { active = false; };
  }, [destination?.latitude, destination?.longitude, pickup.latitude, pickup.longitude]);
  useEffect(() => {
    if (!destination) { setOptions(null); return; }
    let active = true;
    setOptions(null); setOptionsError("");
    ridesApi.estimateOptions(pickup, destination, rideType)
      .then((res) => {
        if (!active) return;
        const list = res.data?.data?.options ?? [];
        if (list.length) setOptions(list);
        else setOptionsError("Prices are unavailable right now. Try again in a moment.");
      })
      .catch((e) => active && setOptionsError(getApiErrorMessage(e)));
    walletApi.getBalance().then((res) => active && setWalletBalance(Number(res.data?.balance ?? 0))).catch(() => {});
    return () => { active = false; };
  }, [destination?.latitude, destination?.longitude, pickup.latitude, pickup.longitude, rideType]);

  // ─── Nearby drivers while planning (coarse positions from the server) ──────
  const [nearby, setNearby] = useState<Point[]>([]);
  const nearKey = gps ? `${gps.latitude.toFixed(3)},${gps.longitude.toFixed(3)}` : "";
  useEffect(() => {
    if (ride || !gps) { setNearby([]); return; }
    let active = true;
    const load = () => realtimeApi.getNearbyDrivers(pickup.latitude, pickup.longitude, 3)
      .then((res) => active && setNearby((res.data?.data || []).map((d: any) => ({ latitude: d.latitude, longitude: d.longitude }))))
      .catch(() => active && setNearby([]));
    load();
    const timer = setInterval(load, 20_000);
    return () => { active = false; clearInterval(timer); };
  }, [nearKey, Boolean(ride), pickupOverride?.latitude]);

  // MoMo ride payments are switched on server-side (FINANCIAL_WRITES_ENABLED); hide them when off.
  const [momoAvailable, setMomoAvailable] = useState(false);
  useEffect(() => {
    productionApi.status().then((res) => setMomoAvailable(res.data?.data?.features?.momoRidePayments === true)).catch(() => setMomoAvailable(false));
  }, []);

  // ─── Requesting ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const request = async (choice: TripChoice) => {
    if (!destination) return;
    setSubmitting(true);
    try {
      const res = await ridesApi.requestRide({
        pickup, destination,
        vehicleType: choice.vehicleType,
        rideType,
        parcel: choice.parcel,
        offeredFare: choice.offer,
        backupDrivers: 3,
        passengers: choice.passengers,
        paymentMethod: choice.paymentMethod,
        ...(choice.scheduledAt ? kigaliParts(choice.scheduledAt) : {}),
      });
      const data = res.data?.data;
      if (data?.rideStatus === "scheduled") {
        Alert.alert("Ride scheduled", "We'll remind you an hour before and start finding a driver 15 minutes ahead.", [
          { text: "View ride", onPress: () => router.push({ pathname: "/(passenger)/ride-details/[id]", params: { id: data.rideId } } as any) },
          { text: "OK" },
        ]);
        resetPlanning();
      } else {
        trip.setNotifiedDrivers(data?.notifiedDrivers ?? 0);
        await trip.refresh();
      }
    } catch (e: any) {
      const body = e?.response?.data;
      if (e?.response?.status === 409 && body?.rideId) { await trip.refresh(); return; } // already had a ride: show it
      if (body?.code === "INSUFFICIENT_WALLET_BALANCE") {
        Alert.alert("Wallet balance too low", getApiErrorMessage(e), [{ text: "Top up", onPress: () => router.push("/(passenger)/wallet" as any) }, { text: "OK" }]);
        return;
      }
      Alert.alert("Ride request failed", getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };
  const resetPlanning = () => { setDestination(null); setOptions(null); setRideType("ride"); };
  useEffect(() => { if (ride) resetPlanning(); }, [ride?._id]);

  // ─── Cancel / SOS / rating ─────────────────────────────────────────────────
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const cancel = async (reason: string) => {
    if (!ride) return;
    setCancelBusy(true);
    try { await ridesApi.cancelRide(ride._id, reason); setCancelOpen(false); await trip.refresh(); }
    catch (e) { Alert.alert("Couldn't cancel", getApiErrorMessage(e)); }
    finally { setCancelBusy(false); }
  };
  const [sosOpen, setSosOpen] = useState(false);
  const [sosBusy, setSosBusy] = useState(false);
  const sendSos = async () => {
    setSosBusy(true);
    try {
      const res = await productionApi.createSafetyEvent({ rideId: ride?._id, type: "sos", category: "active_ride", location: gps ? { ...gps, capturedAt: new Date().toISOString() } : undefined });
      setSosOpen(false);
      Alert.alert("SOS sent", t("trip.sos_sent", { count: String(res.data?.data?.contactsNotified ?? 0) }));
    } catch (e) { Alert.alert("SOS failed — call 112", getApiErrorMessage(e)); }
    finally { setSosBusy(false); }
  };

  const finished = trip.finished;
  const [ratingBusy, setRatingBusy] = useState(false);
  useEffect(() => {
    if (!finished) return;
    if (finished.rideStatus === "cancelled" || finished.rideStatus === "expired") {
      Alert.alert(finished.rideStatus === "expired" ? "No driver found" : "Ride cancelled", finished.rideStatus === "expired" ? "No driver accepted in time. Try again or raise your offer." : "This ride was cancelled.");
      trip.clearFinished();
    }
  }, [finished?._id, finished?.rideStatus]);
  const rate = async (rating: number, comment: string, tip: number) => {
    if (!finished) return;
    setRatingBusy(true);
    try {
      const res = await ridesApi.rateRide(finished._id, { rating, comment: comment || undefined, tip: tip || undefined });
      trip.clearFinished();
      if (res.data?.tipError) Alert.alert("Rating saved", `Your tip wasn't sent: ${res.data.tipError}`);
    }
    catch (e) { Alert.alert("Couldn't save rating", getApiErrorMessage(e)); }
    finally { setRatingBusy(false); }
  };
  const saveFinishedPlace = async (label: "Home" | "Work") => {
    if (!finished) return;
    try { await placesApi.save({ label, ...finished.destination }); Alert.alert("Saved", `${finished.destination.name} saved as ${label}.`); }
    catch (e) { Alert.alert("Couldn't save place", getApiErrorMessage(e)); }
  };

  // ─── Map content ───────────────────────────────────────────────────────────
  const route = useMemo(() => {
    const encoded = routeInfo?.encodedPolyline || options?.find((o) => o.vehicleType === "motor")?.encodedPolyline;
    if (destination) return encoded ? decodePolyline(encoded) : [pickup, destination];
    if (ride) return [ride.pickup, ride.destination];
    return [];
  }, [options, routeInfo, destination?.latitude, ride?._id]);
  const mapDrivers = ride?.driver?.lastLocation ? [{ ...ride.driver.lastLocation, label: ride.driver.firstName }] : nearby;
  const mapCenter = ride ? (["in_progress", "stop_requested"].includes(ride.rideStatus) && ride.driver?.lastLocation ? ride.driver.lastLocation : ride.pickup) : pickup;
  const onMapPress = async (point: Point) => {
    if (ride) return;
    let name = "Pinned location";
    try { const [g] = await Location.reverseGeocodeAsync(point); if (g) name = formatPlace(g, name); } catch { /* keep generic */ }
    setDestination({ name, ...point });
  };

  // ─── Bottom sheet ──────────────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { setCollapsed(false); scroll.current?.scrollTo({ y: 0, animated: false }); }, [ride?.rideStatus, Boolean(destination)]);
  const s = styles(colors);
  const summary = ride ? `${ride.rideStatus === "searching" ? t("trip.finding") : ride.driver?.firstName ?? ""} · ${ride.destination.name}` : destination ? destination.name : t("trip.where_to");

  return (
    <View style={s.container}>
      <MapCanvas center={mapCenter} destination={ride ? ride.destination : destination} route={route} drivers={mapDrivers} onPress={onMapPress} />

      <View style={[s.topBar, { top: insets.top + 10 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("ride.open_profile")} style={s.roundBtn} onPress={() => router.push("/(passenger)/profile")}>
          {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={s.avatar} /> : <Feather name="user" size={20} color={colors.primary} />}
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open my rides" style={s.roundBtn} onPress={() => router.push("/(passenger)/rides")}>
          <Feather name="list" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {locationIssue ? (
        <View accessibilityRole="alert" style={[s.banner, { top: insets.top + 64 }]}>
          <Feather name="alert-triangle" size={16} color="#fff" />
          <Text style={s.bannerText}>{locationIssue === "denied" ? "Location permission is off. Choose your pickup by search, or allow location in Settings." : "GPS is off. Turn it on so drivers can find you."}</Text>
        </View>
      ) : null}

      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={collapsed ? "Expand ride panel" : "Collapse ride panel to see the map"} onPress={() => setCollapsed(!collapsed)} style={s.handleArea}>
          <View style={s.handle} />
          {collapsed ? <Text style={s.collapsedText} numberOfLines={1}>{summary}</Text> : null}
        </TouchableOpacity>
        {!collapsed ? (
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {trip.loading ? <ActivityIndicator color={colors.primary} style={{ padding: 32 }} />
              : ride?.rideStatus === "searching" || ride?.rideStatus === "requested" ? (
                <SearchingPanel ride={ride} notifiedDrivers={trip.notifiedDrivers} offers={trip.offers} onNotified={trip.setNotifiedDrivers} onDismissOffer={trip.dismissOffer} onChanged={trip.refresh} onCancel={() => setCancelOpen(true)} />
              ) : ride ? (
                <TripPanel ride={ride} momoAvailable={momoAvailable} onChanged={trip.refresh} onCancel={() => setCancelOpen(true)} onSos={() => setSosOpen(true)} />
              ) : destination ? (
                <TripOptionsPanel route={routeInfo} destinationName={destination.name} rideType={rideType} options={options} optionsError={optionsError} walletBalance={walletBalance}
                  preferredPayment={user?.preferredPayment === "MOMO" && momoAvailable ? "momo" : "cash"} momoAvailable={momoAvailable} submitting={submitting} onBack={() => setDestination(null)} onSubmit={request} />
              ) : (
                <WhereToPanel pickup={pickup} pickupIsGps={!pickupOverride} near={gps ?? KIGALI} rideType={rideType} onRideType={setRideType} onPickup={setPickupOverride} onDestination={setDestination} />
              )}
          </ScrollView>
        ) : null}
      </View>

      <CancelSheet visible={cancelOpen} busy={cancelBusy} onKeep={() => setCancelOpen(false)} onConfirm={cancel} />
      <SosSheet visible={sosOpen} busy={sosBusy} hasContacts={Boolean(user?.emergencyContacts?.length)} onClose={() => setSosOpen(false)} onSend={sendSos} />
      <RatingSheet
        visible={finished?.rideStatus === "completed" && !finished.passengerRating}
        driverName={finished?.driver?.firstName || "your driver"}
        fare={finished?.fare || 0}
        walletBalance={walletBalance}
        busy={ratingBusy}
        onSkip={trip.clearFinished}
        onSubmit={rate}
        onSavePlace={saveFinishedPlace}
      />
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  topBar: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center" },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.backgroundCard, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 4, overflow: "hidden" },
  avatar: { width: 46, height: 46 },
  banner: { position: "absolute", left: 16, right: 16, backgroundColor: "#B45309", borderRadius: 12, padding: 10, flexDirection: "row", gap: 8, alignItems: "center" },
  bannerText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12, flex: 1 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "68%", backgroundColor: c.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, elevation: 12 },
  handleArea: { alignItems: "center", paddingVertical: 10, minHeight: 32 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border },
  collapsedText: { marginTop: 8, color: c.textPrimary, fontFamily: "Inter_600SemiBold" },
});
