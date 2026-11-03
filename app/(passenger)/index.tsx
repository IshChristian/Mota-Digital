import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, type LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { Alert } from "@/components/GlobalAlert";
import { ridesApi, realtimeApi, walletApi, productionApi, placesApi, mapsApi, getApiErrorMessage, type FareOption, type Place, type RouteResult } from "@/services/api";
import { nameForPoint } from "@/utils/formatPlace";
import { decodePolyline, haversineKm } from "@/utils/geo";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { useRoadRoute, remaining } from "@/hooks/useRoadRoute";
import { useWideLayout } from "@/hooks/useWideLayout";
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
  const live = useLiveLocation();
  const gps: Point | null = live.position ? { latitude: live.position.latitude, longitude: live.position.longitude } : null;
  const [gpsName, setGpsName] = useState(t("trip.current_location"));
  const locationIssue = live.issue;
  const [pickupOverride, setPickupOverride] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [rideType, setRideType] = useState<"ride" | "parcel">("ride");
  const pickup: Place = pickupOverride ?? { name: gpsName, ...(gps ?? KIGALI) };

  // Name the GPS pickup once (and again if the passenger moves ~300 m).
  const namedAt = useRef<Point | null>(null);
  useEffect(() => {
    if (!gps || (namedAt.current && haversineKm(namedAt.current, gps) < 0.3)) return;
    namedAt.current = gps;
    void nameForPoint(gps, t("trip.current_location")).then(setGpsName);
  }, [gps?.latitude, gps?.longitude]);

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
  // ─── Available drivers around the pickup, refreshed every few seconds so they're seen moving ──
  const [nearby, setNearby] = useState<Array<Point & { id: string; heading?: number | null }>>([]);
  const nearKey = `${pickup.latitude.toFixed(3)},${pickup.longitude.toFixed(3)}`;
  const searchingDrivers = !ride || ride.rideStatus === "searching" || ride.rideStatus === "requested";
  useEffect(() => {
    if (!searchingDrivers || (!gps && !pickupOverride)) { setNearby([]); return; }
    let active = true;
    const load = () => realtimeApi.getNearbyDrivers(pickup.latitude, pickup.longitude, 5)
      .then((res) => active && setNearby((res.data?.data || []).map((d: any, i: number) => ({ id: String(d.id ?? i), latitude: Number(d.latitude), longitude: Number(d.longitude), heading: d.heading ?? null }))))
      .catch(() => {});
    load();
    const timer = setInterval(load, 5_000);
    return () => { active = false; clearInterval(timer); };
  }, [nearKey, searchingDrivers, Boolean(gps)]);

  // ─── While the driver comes: share the passenger's position with them, and track the driver ──
  const toPickup = Boolean(ride && ["accepted", "approaching", "arrived", "start_requested"].includes(ride.rideStatus));
  const sharedAt = useRef<{ at: number; point: Point } | null>(null);
  useEffect(() => {
    if (!toPickup || !gps) return;
    const last = sharedAt.current;
    if (last && Date.now() - last.at < 4000 && haversineKm(last.point, gps) < 0.01) return;
    sharedAt.current = { at: Date.now(), point: gps };
    realtimeApi.updateLocation(gps).catch(() => {});
  }, [toPickup, gps?.latitude, gps?.longitude]);
  const driverPoint = ride?.driver?.lastLocation ? { latitude: Number(ride.driver.lastLocation.latitude), longitude: Number(ride.driver.lastLocation.longitude) } : null;
  const onTrip = Boolean(ride && ["in_progress", "stop_requested"].includes(ride.rideStatus));
  const driverTarget = ride ? (toPickup ? ride.pickup : onTrip ? ride.destination : null) : null;
  const driverRoute = useRoadRoute(driverPoint, driverTarget, 0.2);
  const eta = remaining(driverRoute, driverPoint, driverTarget);

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
    if (ride && driverPoint && driverRoute) return driverRoute.points;
    const encoded = routeInfo?.encodedPolyline || options?.find((o) => o.vehicleType === "motor")?.encodedPolyline;
    if (destination) return encoded ? decodePolyline(encoded) : [pickup, destination];
    if (ride) return [ride.pickup, ride.destination];
    return [];
  }, [options, routeInfo, destination?.latitude, ride?._id, driverRoute, Boolean(driverPoint)]);
  const mapDrivers = ride && driverPoint
    ? [{ ...driverPoint, id: "assigned", heading: ride.driver?.lastLocation?.heading ?? null, label: ride.driver?.firstName, highlight: true, color: "#84cc16" }]
    : searchingDrivers ? nearby : [];
  const mapCenter = ride ? (onTrip && driverPoint ? driverPoint : ride.pickup) : pickup;
  const [recenter, setRecenter] = useState(0);
  const fitKey = ride
    ? `ride:${ride._id}:${ride.rideStatus}:${driverPoint ? 1 : 0}:${recenter}`
    : `plan:${gps ? 1 : 0}:${nearby.length ? 1 : 0}:${pickupOverride ? `${pickupOverride.latitude},${pickupOverride.longitude}` : ""}:${destination ? `${destination.latitude},${destination.longitude}` : ""}:${route.length > 2 ? 1 : 0}:${recenter}`;
  const onMapPress = async (point: Point) => {
    if (ride) return;
    setDestination({ name: await nameForPoint(point, "Pinned location"), ...point });
  };

  // ─── Bottom sheet ──────────────────────────────────────────────────────────
  const layout = useWideLayout();
  const [sheetHeight, setSheetHeight] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { setCollapsed(false); scroll.current?.scrollTo({ y: 0, animated: false }); }, [ride?.rideStatus, Boolean(destination)]);
  const s = styles(colors);
  const mapPadding = layout.wide
    ? { top: 90, left: layout.panelWidth + 48, right: 60, bottom: 60 }
    : { top: insets.top + 80, left: 40, right: 40, bottom: sheetHeight + 30 };
  const etaText = ride && eta && driverTarget ? (
    toPickup
      ? ride.rideStatus === "arrived" || ride.rideStatus === "start_requested" ? t("live.driver_arrived")
        : eta.km <= 0.3 ? t("live.driver_arriving") : t("live.driver_away", { km: eta.km.toFixed(1), min: String(eta.min) })
      : t("live.to_destination", { km: eta.km.toFixed(1), min: String(eta.min) })
  ) : "";
  const arriving = toPickup && Boolean(eta && (eta.km <= 0.3 || ride?.rideStatus === "arrived" || ride?.rideStatus === "start_requested"));
  const summary = ride ? `${ride.rideStatus === "searching" ? t("trip.finding") : ride.driver?.firstName ?? ""} · ${ride.destination.name}` : destination ? destination.name : t("trip.where_to");

  const panel = (
    <>
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
    </>
  );
  const locationBanner = locationIssue ? (
    <View accessibilityRole="alert" style={[s.banner, layout.wide ? s.bannerWide : { top: insets.top + 64 }]}>
      <Feather name="alert-triangle" size={16} color="#fff" />
      <Text style={s.bannerText}>{t(locationIssue === "denied" ? "live.location_denied" : locationIssue === "insecure" ? "live.location_insecure" : "live.location_off")}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={live.retry}><Text style={[s.bannerText, { textDecorationLine: "underline", flex: 0 }]}>{t("drive.retry")}</Text></TouchableOpacity>
    </View>
  ) : null;
  const driversChip = !ride && !destination ? (
    <View style={s.chip}>
      <View style={[s.chipDot, { backgroundColor: nearby.length ? colors.success : colors.textTertiary }]} />
      <Text style={s.chipText}>{nearby.length ? t("live.drivers_nearby", { count: String(nearby.length) }) : t("live.no_drivers_nearby")}</Text>
    </View>
  ) : null;
  const etaCard = etaText ? (
    <View accessibilityLiveRegion="polite" style={[s.etaCard, arriving && { backgroundColor: colors.success }]}>
      <Feather name={arriving ? "bell" : toPickup ? "navigation" : "flag"} size={18} color={arriving ? "#fff" : colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[s.etaTitle, arriving && { color: "#fff" }]} numberOfLines={1}>{etaText}</Text>
        {toPickup && !arriving ? <Text style={s.etaSub} numberOfLines={1}>{t("live.driver_coming")}{ride?.driver?.plate && ride.driver.plate !== "N/A" ? ` · ${ride.driver.plate}` : ""}</Text> : null}
      </View>
    </View>
  ) : null;
  const locateButton = (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("live.locate_me")} style={s.roundBtn} onPress={() => { if (!gps) live.retry(); setRecenter((n) => n + 1); }}>
      <Feather name="crosshair" size={20} color={gps ? colors.primary : colors.textSecondary} />
    </TouchableOpacity>
  );
  const map = (
    <MapCanvas center={mapCenter} me={gps} pickup={ride || pickupOverride ? { ...(ride ? ride.pickup : pickup), label: t("live.pickup") } : null}
      destination={ride ? { ...ride.destination, label: ride.destination.name } : destination ? { ...destination, label: destination.name } : null}
      route={route} drivers={mapDrivers} onPress={onMapPress} fitKey={fitKey} padding={mapPadding} zoomControls={layout.wide} fitDrivers={!ride && !destination} />
  );

  // Cancel, SOS and rating sheets: needed by both the phone and the wide layout.
  const sheets = (
    <>
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
    </>
  );

  if (layout.wide) {
    return (
      <View style={s.container}>
        {map}
        <View style={[s.sidePanel, { width: layout.panelWidth }]}>
          <View style={s.panelHeader}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("ride.open_profile")} style={s.roundBtnFlat} onPress={() => router.push("/(passenger)/profile")}>
              {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={s.avatar} /> : <Feather name="user" size={20} color={colors.primary} />}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.panelTitle} numberOfLines={1}>{user?.firstName ? t("live.hi", { name: user.firstName }) : "MOTA"}</Text>
              {driversChip ? <Text style={s.panelSub}>{nearby.length ? t("live.drivers_nearby", { count: String(nearby.length) }) : t("live.no_drivers_nearby")}</Text> : null}
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open my rides" style={s.roundBtnFlat} onPress={() => router.push("/(passenger)/rides")}>
              <Feather name="list" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {etaCard ? <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{etaCard}</View> : null}
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            {panel}
          </ScrollView>
        </View>
        {locationBanner}
        <View style={s.wideMapButtons}>{locateButton}</View>
        {sheets}
      </View>
    );
  }

  return (
    <View style={s.container}>
      {map}

      <View style={[s.topBar, { top: insets.top + 10 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("ride.open_profile")} style={s.roundBtn} onPress={() => router.push("/(passenger)/profile")}>
          {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={s.avatar} /> : <Feather name="user" size={20} color={colors.primary} />}
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>{driversChip}</View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open my rides" style={s.roundBtn} onPress={() => router.push("/(passenger)/rides")}>
          <Feather name="list" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {locationBanner}

      <View style={[s.floating, { bottom: (collapsed ? 0 : sheetHeight) + 12 }]} pointerEvents="box-none">
        <View style={{ flex: 1 }}>{etaCard}</View>
        {locateButton}
      </View>

      <View onLayout={(e: LayoutChangeEvent) => setSheetHeight(e.nativeEvent.layout.height)} style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={collapsed ? "Expand ride panel" : "Collapse ride panel to see the map"} onPress={() => setCollapsed(!collapsed)} style={s.handleArea}>
          <View style={s.handle} />
          {collapsed ? <Text style={s.collapsedText} numberOfLines={1}>{summary}</Text> : null}
        </TouchableOpacity>
        {!collapsed ? (
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {panel}
          </ScrollView>
        ) : null}
      </View>

      {sheets}
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
  bannerWide: { top: 16, left: undefined, right: 16, width: 380 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.backgroundCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: c.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  floating: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "flex-end", gap: 10 },
  etaCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.backgroundCard, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  etaTitle: { color: c.textPrimary, fontFamily: "Inter_700Bold", fontSize: 14 },
  etaSub: { color: c.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  sidePanel: { position: "absolute", left: 16, top: 16, bottom: 16, backgroundColor: c.backgroundCard, borderRadius: 24, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, elevation: 12 },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  panelTitle: { color: c.textPrimary, fontFamily: "Inter_700Bold", fontSize: 18 },
  panelSub: { color: c.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  roundBtnFlat: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.backgroundElevated, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  wideMapButtons: { position: "absolute", right: 16, bottom: 110, gap: 10 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "68%", maxWidth: 640, marginHorizontal: "auto", backgroundColor: c.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, elevation: 12 },
  handleArea: { alignItems: "center", paddingVertical: 10, minHeight: 32 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border },
  collapsedText: { marginTop: 8, color: c.textPrimary, fontFamily: "Inter_600SemiBold" },
});
