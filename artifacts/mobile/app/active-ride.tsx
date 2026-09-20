import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useTheme } from "@/context/ThemeContext";
import { driverApi, ridesApi } from "@/services/api";
import { OpenStreetMapView } from "@/components/OpenStreetMapView";
import { GoogleMapWebView } from "@/components/GoogleMapWebView";

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

type RideState = "accepted" | "approaching" | "arrived" | "start_requested" | "in_progress" | "stop_requested" | "awaiting_payment" | "completed";

export default function ActiveRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { rideId } = useLocalSearchParams();

  const [rideState, setRideState] = useState<RideState>("approaching");
  const [mapProvider, setMapProvider] = useState<'openstreetmap' | 'google'>('openstreetmap');
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Real GPS for driver and passenger positions
  const [driverPos, setDriverPos] = useState({ latitude: -1.9536, longitude: 30.0606 });
  const [passengerPos, setPassengerPos] = useState({ latitude: -1.9500, longitude: 30.0650 });
  const [destPos, setDestPos] = useState({ latitude: -1.9773, longitude: 30.1025 });

  // Realtime GPS tracking for driver
  useEffect(() => {
    let sub: any;
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setDriverPos({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });

          sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5 },
            (newLoc) => {
              setDriverPos({
                latitude: newLoc.coords.latitude,
                longitude: newLoc.coords.longitude,
              });
              driverApi.updateLocation({ latitude: newLoc.coords.latitude, longitude: newLoc.coords.longitude }).catch((error) => console.warn('Location update failed', error));
            }
          );
        }
      } catch (e) { console.warn('GPS tracking unavailable', e); }
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // Ride data
  const [rideData, setRideData] = useState<any>({
    passengerName: "Passenger",
    pickup: "Kigali City Center",
    destination: "Remera, Kigali",
    fare: 1500,
    distanceKm: 3.2,
    etaMin: 8,
  });

  useEffect(() => {
    const fetchRide = async () => {
      try {
        if (!rideId) return;
        const res = await ridesApi.getRideDetails(rideId as string);
        const data = res.data?.data?.ride || res.data?.ride || res.data;
        if (data) {
          setRideData({
            passengerName: data.passenger?.firstName || data.passengerName || "Passenger",
            pickup: typeof data.pickup === 'string' ? data.pickup : (data.pickup?.name || "Pickup Location"),
            destination: typeof data.destination === 'string' ? data.destination : (data.destination?.name || "Destination Location"),
            fare: data.offeredFare || data.fare || 1500,
            distanceKm: data.distanceKm || 3.2,
            etaMin: data.etaMin || 8,
          });

          if (data.pickup) {
            setPassengerPos({ latitude: data.pickup.latitude ?? data.pickup.lat, longitude: data.pickup.longitude ?? data.pickup.lng });
          }
          if (data.destination) {
            setDestPos({ latitude: data.destination.latitude ?? data.destination.lat, longitude: data.destination.longitude ?? data.destination.lng });
          }

          if (data.rideStatus || data.status) {
            setRideState(data.rideStatus || data.status);
          }
        }
      } catch (e) {
        console.error("Failed to fetch ride details", e);
      }
    };
    fetchRide();
    const interval = setInterval(fetchRide, 3000);
    return () => clearInterval(interval);
  }, [rideId]);


  const handleArrival = async () => {
    setLoading(true);
    try {
      if (rideId) await ridesApi.notifyArrival(rideId as string);
      setRideState("arrived");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to notify the passenger of your arrival.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartRide = async () => {
    setLoading(true);
    setError("");
    try {
      if (rideId) await ridesApi.requestStart(rideId as string);
      setRideState("start_requested");
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to request passenger confirmation.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    setLoading(true);
    try {
      if (rideId) await ridesApi.requestStop(rideId as string);
      setRideState("stop_requested");
    } catch (e) {
      setError("Failed to complete ride.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimFare = async () => {
    setLoading(true); setError("");
    try {
      if (rideId) await ridesApi.claimFare(rideId as string);
      setRideState("completed");
    } catch (e: any) { setError(e.response?.data?.message || "Payment is not confirmed yet."); }
    finally { setLoading(false); }
  };

  const openNavigation = () => {
    const target = rideState === "in_progress" ? destPos : passengerPos;
    const label = rideState === "in_progress" ? rideData.destination : rideData.pickup;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${target.latitude},${target.longitude}`,
      android: `geo:0,0?q=${target.latitude},${target.longitude}(${label})`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`
    });
    if (url) Linking.openURL(url);
  };

  const s = styles(colors, isDark);
  const approachDistanceKm = (() => { const toRad = (value: number) => value * Math.PI / 180; const dLat = toRad(passengerPos.latitude - driverPos.latitude); const dLng = toRad(passengerPos.longitude - driverPos.longitude); const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(driverPos.latitude)) * Math.cos(toRad(passengerPos.latitude)) * Math.sin(dLng / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); })();
  const approachEtaMin = Math.max(1, Math.ceil((approachDistanceKm / 20) * 60));

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {rideState === "approaching" && "Driving to Passenger"}
          {rideState === "arrived" && "Waiting for Passenger"}
          {rideState === "in_progress" && "En Route to Destination"}
          {rideState === "completed" && "Ride Completed 🎉"}
        </Text>
        <TouchableOpacity onPress={openNavigation} style={s.navIconBtn}>
          <Feather name="navigation" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Real Map View with Directions for Motor Driver */}
      <View style={s.mapContainer}>
        {mapProvider === 'openstreetmap' ? (
          <OpenStreetMapView
            center={driverPos}
            destination={rideState === 'in_progress' ? destPos : passengerPos}
            route={[driverPos, rideState === 'in_progress' ? destPos : passengerPos]}
            drivers={[{ ...driverPos, label: 'Driver' }]}
            onReady={() => setMapReady(true)}
          />
        ) : GOOGLE_MAPS_APIKEY ? (
          <GoogleMapWebView apiKey={GOOGLE_MAPS_APIKEY} center={driverPos} destination={rideState === 'in_progress' ? destPos : passengerPos} route={[driverPos, rideState === 'in_progress' ? destPos : passengerPos]} drivers={[{ ...driverPos, label: 'Driver' }]} onReady={() => setMapReady(true)} onError={setError} />
        ) : null}

        {!mapReady ? <View style={[s.mapLoading, { pointerEvents: 'none' }]}><Text style={s.mapLoadingText}>Loading {mapProvider === 'openstreetmap' ? 'Server 1' : 'Server 2'}…</Text></View> : null}
        <View style={s.mapServerSwitch}>
          <TouchableOpacity onPress={() => { setMapReady(false); setMapProvider('openstreetmap'); }} style={[s.serverButton, mapProvider === 'openstreetmap' && s.serverButtonActive]}><Text style={[s.serverButtonText, mapProvider === 'openstreetmap' && s.serverButtonTextActive]}>Server 1</Text><Text style={[s.serverCaption, mapProvider === 'openstreetmap' && s.serverButtonTextActive]}>OpenMap</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setMapReady(false); setMapProvider('google'); }} style={[s.serverButton, mapProvider === 'google' && s.serverButtonActive]}><Text style={[s.serverButtonText, mapProvider === 'google' && s.serverButtonTextActive]}>Server 2</Text><Text style={[s.serverCaption, mapProvider === 'google' && s.serverButtonTextActive]}>Google</Text></TouchableOpacity>
        </View>
        {mapProvider === 'openstreetmap' ? <Text style={s.mapAttribution}>© OpenStreetMap contributors</Text> : null}

        {/* Floating Navigation Button */}
        <TouchableOpacity style={s.floatingNavBtn} onPress={openNavigation}>
          <Feather name="navigation" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={s.floatingNavText}>Start GPS Navigation</Text>
        </TouchableOpacity>

        <View style={s.mapOverlay}>
          <Text style={s.overlayText}>
            {rideState === "approaching" ? "📍 Pickup: " + rideData.pickup : ""}
            {rideState === "arrived" ? "⏱️ Waiting at Pickup Location" : ""}
            {rideState === "in_progress" ? "🏁 Destination: " + rideData.destination : ""}
          </Text>
        </View>
      </View>

      <View style={s.bottomSheet}>
        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {/* State: Approaching */}
        {rideState === "approaching" && (
          <View>
            <Text style={s.sheetTitle}>{rideData.passengerName}</Text>
            <Text style={s.sheetSub}>{approachEtaMin} min away • {approachDistanceKm.toFixed(1)} km from passenger</Text>
            <View style={s.actionsRow}>
              <TouchableOpacity style={s.iconBtn}>
                <Feather name="phone" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn}>
                <Feather name="message-circle" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.primaryBtn, { opacity: loading || approachDistanceKm > 2 ? .55 : 1 }]} onPress={handleArrival} disabled={loading || approachDistanceKm > 2}>
              <Text style={s.primaryBtnText}>{loading ? "Notifying passenger..." : approachDistanceKm > 2 ? `Arrival unlocks within 2 km` : "I've Arrived — Notify Passenger"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: Arrived */}
        {rideState === "arrived" && (
          <View>
            <Text style={s.sheetTitle}>Passenger Arrived?</Text>
            <Text style={s.sheetSub}>Request confirmation from {rideData.passengerName} before starting.</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={handleStartRide} disabled={loading}>
              <Text style={s.primaryBtnText}>{loading ? "Notifying passenger..." : "Request Passenger to Start"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {rideState === "start_requested" && <View><Text style={s.sheetTitle}>Waiting for passenger</Text><Text style={s.sheetSub}>The ride starts only after the passenger confirms.</Text></View>}

        {/* State: In Progress */}
        {rideState === "in_progress" && (
          <View>
            <Text style={s.sheetTitle}>En route to {rideData.destination}</Text>
            <Text style={s.sheetSub}>ETA: {rideData.etaMin} min • {rideData.distanceKm.toFixed(1)} km remaining</Text>
            <View style={s.fareBox}>
              <Text style={s.fareLabel}>Agreed Fare</Text>
              <Text style={s.fareValue}>{rideData.fare.toLocaleString()} RWF</Text>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={handleCompleteRide} disabled={loading}>
              <Text style={s.primaryBtnText}>{loading ? "Requesting..." : "Request Stop"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {rideState === "stop_requested" && <View><Text style={s.sheetTitle}>Waiting for passenger</Text><Text style={s.sheetSub}>The passenger must confirm arrival before payment.</Text></View>}
        {rideState === "awaiting_payment" && <View><Text style={s.sheetTitle}>Awaiting payment</Text><Text style={s.sheetSub}>Claim becomes available after the payment provider confirms the fare.</Text><TouchableOpacity style={s.primaryBtn} onPress={handleClaimFare} disabled={loading}><Text style={s.primaryBtnText}>{loading ? 'Checking…' : 'Claim confirmed fare'}</Text></TouchableOpacity></View>}

        {/* State: Completed */}
        {rideState === "completed" && (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Feather name="check-circle" size={48} color="#10B981" style={{ marginBottom: 16 }} />
            <Text style={s.sheetTitle}>Ride Finished</Text>
            <Text style={s.sheetSub}>Total Fare: {rideData.fare.toLocaleString()} RWF</Text>
            <TouchableOpacity style={[s.primaryBtn, { marginTop: 24, width: "100%" }]} onPress={() => router.back()}>
              <Text style={s.primaryBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.textPrimary, flex: 1, textAlign: "center", marginHorizontal: 8 },
  navIconBtn: { padding: 8, borderRadius: 8, backgroundColor: `${colors.primary}15` },
  mapContainer: { flex: 1, position: "relative" },
  map: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#E5E7EB" },
  mapLoading: { position: "absolute", top: "45%", alignSelf: "center", backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, zIndex: 8 },
  mapLoadingText: { color: "#111827", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  mapServerSwitch: { position: "absolute", top: 16, left: 16, flexDirection: "row", backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 14, padding: 4, zIndex: 20, elevation: 10 },
  serverButton: { minWidth: 74, alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  serverButtonActive: { backgroundColor: "#111827" },
  serverButtonText: { color: "#111827", fontFamily: "Inter_700Bold", fontSize: 12 },
  serverButtonTextActive: { color: "#fff" },
  serverCaption: { color: "#6B7280", fontFamily: "Inter_500Medium", fontSize: 9 },
  mapAttribution: { position: "absolute", right: 6, bottom: 4, color: "#374151", backgroundColor: "rgba(255,255,255,0.75)", fontSize: 9, paddingHorizontal: 4, zIndex: 5 },
  driverMarker: { backgroundColor: "#fff", padding: 6, borderRadius: 20, borderWidth: 2, borderColor: colors.primary, elevation: 4 },
  passengerMarker: { backgroundColor: colors.primary, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: "#fff", elevation: 4 },
  destMarker: { backgroundColor: "#10B981", padding: 8, borderRadius: 20, borderWidth: 2, borderColor: "#fff", elevation: 4 },
  floatingNavBtn: { position: "absolute", top: 16, right: 16, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, elevation: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4 },
  floatingNavText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  mapOverlay: { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: colors.backgroundCard, padding: 12, borderRadius: 12, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
  overlayText: { fontFamily: "Inter_600SemiBold", color: colors.textPrimary, fontSize: 13 },
  bottomSheet: { backgroundColor: colors.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  sheetTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.textPrimary, marginBottom: 4 },
  sheetSub: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginBottom: 16 },
  actionsRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  iconBtn: { backgroundColor: `${colors.primary}15`, padding: 12, borderRadius: 12 },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  pinInput: { backgroundColor: colors.inputBg, color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 32, textAlign: "center", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 20, letterSpacing: 10 },
  errorText: { color: "#E63946", fontFamily: "Inter_500Medium", marginBottom: 12, textAlign: "center" },
  fareBox: { backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.05)", padding: 16, borderRadius: 12, marginBottom: 20, alignItems: "center", borderWidth: 1, borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.3)" },
  fareLabel: { color: colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 14 },
  fareValue: { color: "#10B981", fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 4 },
});
