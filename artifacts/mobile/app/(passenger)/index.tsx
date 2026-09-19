import { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, FlatList, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ridesApi, paymentApi, realtimeApi, mapsApi } from "@/services/api";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

type RideState = "idle" | "estimating" | "negotiating" | "searching" | "accepted";

function decodePolyline(encoded: string) {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0, latitude = 0, longitude = 0;
  while (index < encoded.length) {
    let result = 0, shift = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return points;
}

export default function PassengerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [rideState, setRideState] = useState<RideState>("idle");
  const [destination, setDestination] = useState("");
  const [destinationLoc, setDestinationLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [pickupLoc, setPickupLoc] = useState({ latitude: -1.9536, longitude: 30.0606 }); 
  const [locationName, setLocationName] = useState("Kigali, RW");
  
  // Estimation Data
  const [distanceKm, setDistanceKm] = useState(0);
  const [etaMin, setEtaMin] = useState(0);
  const [minFare, setMinFare] = useState(2500);
  const [maxFare, setMaxFare] = useState(3500);
  
  // Negotiation Data
  const [offer, setOffer] = useState(3000);
  const [backupDrivers, setBackupDrivers] = useState(3);
  
  // Searching Data
  const [searchTimer, setSearchTimer] = useState(0);
  const [passengers, setPassengers] = useState(1);
  const [vehicleType, setVehicleType] = useState<"motor"|"car"|null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash"|"momo">("momo");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [locationStatus, setLocationStatus] = useState<"granted" | "denied" | "off">("granted");

  // Nearby available motors (fetched from backend when available)
  const [availableMotors, setAvailableMotors] = useState<any[]>([]);

  const [driverPos, setDriverPos] = useState({ lat: -1.9500, lng: 30.0650 });
  const [rideId, setRideId] = useState<string | null>(null);
  const [acceptedDriver, setAcceptedDriver] = useState<any>(null);
  const [serverRideStatus, setServerRideStatus] = useState<string>('');
  const [mapProvider, setMapProvider] = useState<'openstreetmap' | 'google'>(GOOGLE_MAPS_APIKEY ? 'google' : 'openstreetmap');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [waitingMinimized, setWaitingMinimized] = useState(false);

  useEffect(() => {
    if (!destinationLoc) { setRouteCoordinates([]); return; }
    let active = true;
    const loadRouteAndFare = async () => {
      const [routeResult, fareResult] = await Promise.allSettled([
        mapsApi.getRoute(pickupLoc, destinationLoc),
        ridesApi.estimateFare(pickupLoc, destinationLoc),
      ]);
      if (!active) return;
      if (routeResult.status === 'fulfilled') {
        const route = routeResult.value.data?.data;
        const coordinates = route?.encodedPolyline ? decodePolyline(route.encodedPolyline) : [];
        setRouteCoordinates(coordinates.length > 1 ? coordinates : [pickupLoc, destinationLoc]);
        setDistanceKm(Number(((route?.distanceMeters || 0) / 1000).toFixed(1)));
        setEtaMin(Math.max(1, Math.ceil(Number(String(route?.duration || '0s').replace('s', '')) / 60)));
      } else {
        setRouteCoordinates([pickupLoc, destinationLoc]);
      }
      if (fareResult.status === 'fulfilled') {
        const estimate = fareResult.value.data?.data || fareResult.value.data;
        setDistanceKm(estimate.distanceKm);
        setEtaMin(estimate.durationMinutes);
        setMinFare(estimate.minimumFare);
        setMaxFare(estimate.maximumFare);
        setOffer(estimate.suggestedFare);
      }
    };
    void loadRouteAndFare();
    return () => { active = false; };
  }, [destinationLoc?.latitude, destinationLoc?.longitude]);

  // 0. GPS Location Tracking
  useEffect(() => {
    let locationSubscription: any;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        Alert.alert('Permission required', 'Allow location access to use MOTA');
        return;
      }

      let isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        setLocationStatus('off');
        Alert.alert('GPS Disabled', 'Please turn on location services on your device for real-time ride matching.');
      } else {
        setLocationStatus('granted');
      }
      
      let location = await Location.getCurrentPositionAsync({});
      setPickupLoc({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode to get city name
      try {
        let geocode = await Location.reverseGeocodeAsync(location.coords);
        if (geocode && geocode.length > 0) {
          const name = geocode[0].name || geocode[0].street;
          const city = geocode[0].city || geocode[0].region || geocode[0].district;
          if (name) {
            setLocationName(`${name}, ${city}`);
          } else {
            setLocationName(`${city || geocode[0].isoCountryCode}`);
          }
        }
      } catch (e) {}

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
           setLocationStatus('granted');
           setPickupLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      );
    })();
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  // 1. Fetch nearby available motors from backend
  useEffect(() => {
    let interval: any;
    if (rideState === "idle") {
      const fetchNearby = async () => {
        try {
          const res = await realtimeApi.getNearbyDrivers(pickupLoc.latitude, pickupLoc.longitude, 3);
          const drivers = res.data?.data || [];
          if (Array.isArray(drivers)) {
              setAvailableMotors(drivers.map((d: any, i: number) => ({
                id: d.id || String(i),
                name: d.firstName || 'Rider',
                plate: d.plate || '',
                lat: d.latitude,
                lng: d.longitude,
              })));
          }
        } catch (e) {
          setAvailableMotors([]);
        }
      };
      fetchNearby();
      interval = setInterval(fetchNearby, 15000);
    }
    return () => clearInterval(interval);
  }, [rideState, pickupLoc]);

  // 2. Poll for rider acceptance (real waiting)
  useEffect(() => {
    let interval: any;
    if (rideState === "searching" && rideId) {
      interval = setInterval(async () => {
        setSearchTimer((t) => t + 1);
        try {
          const res = await ridesApi.getRideDetails(rideId);
          const ride = res.data?.data?.ride || res.data?.ride || res.data;
          if (['accepted', 'approaching', 'arrived', 'start_requested', 'in_progress', 'stop_requested', 'awaiting_payment'].includes(ride?.status)) {
            setServerRideStatus(ride.status);
            setAcceptedDriver(ride.driver || ride.assignedDriver);
            if (ride.driver?.lastLocation) {
              setDriverPos({
                lat: ride.driver.lastLocation.latitude,
                lng: ride.driver.lastLocation.longitude,
              });
            }
            setRideState("accepted");
            clearInterval(interval);
          } else if (ride?.status === 'cancelled' || ride?.status === 'expired') {
            Alert.alert("Ride Update", "No riders available at the moment. Please try again.");
            setRideState("idle");
            clearInterval(interval);
          }
        } catch (e) {
          // Keep polling
        }
      }, 5000);
    } else if (rideState === "searching" && !rideId) {
      // Just timer, no polling (ride request may have failed)
      interval = setInterval(() => setSearchTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [rideState, rideId]);

  // 3. Live assigned-driver position and lifecycle state from the backend.
  useEffect(() => {
    let interval: any;
    if (rideState === "accepted" && rideId) {
      const refresh = async () => {
        try {
          const ride = (await ridesApi.getRideStatus(rideId)).data;
          setServerRideStatus(ride.rideStatus || ride.status || '');
          const location = ride.driverId?.lastLocation || ride.driver?.lastLocation;
          if (location?.latitude != null && location?.longitude != null) {
            setDriverPos({ lat: location.latitude, lng: location.longitude });
            const latKm = (pickupLoc.latitude - location.latitude) * 111;
            const lngKm = (pickupLoc.longitude - location.longitude) * 111 * Math.cos(pickupLoc.latitude * Math.PI / 180);
            const remaining = Math.sqrt(latKm * latKm + lngKm * lngKm);
            setDistanceKm(Number(remaining.toFixed(1)));
            setEtaMin(Math.max(1, Math.ceil((remaining / 20) * 60)));
          }
        } catch (error) { console.warn('Ride tracking refresh failed', error); }
      };
      refresh();
      interval = setInterval(refresh, 3000);
    }
    return () => clearInterval(interval);
  }, [rideState, rideId, pickupLoc.latitude, pickupLoc.longitude]);

  const adjustOffer = (amount: number) => {
    const newOffer = offer + amount;
    if (newOffer >= minFare && newOffer <= maxFare) {
      setOffer(newOffer);
    }
  };

  const handleRequestRide = async () => {
    if (!destinationLoc) {
      Alert.alert('Destination required', 'Select a destination before requesting a ride.');
      return;
    }
    setRideState("searching");
    setWaitingMinimized(false);
    setSearchTimer(0);
    setAcceptedDriver(null);
    try {
      const res = await ridesApi.requestRide({
        pickup: { name: locationName, latitude: pickupLoc.latitude, longitude: pickupLoc.longitude, lat: pickupLoc.latitude, lng: pickupLoc.longitude },
        destination: { name: destination, latitude: destinationLoc?.latitude, longitude: destinationLoc?.longitude, lat: destinationLoc?.latitude, lng: destinationLoc?.longitude },
        offeredFare: offer,
        backupDrivers,
        passengers,
        paymentMethod,
        scheduledDate: isScheduled ? scheduledDate : undefined,
        scheduledTime: isScheduled ? scheduledTime : undefined,
      });
      const id = res.data?.data?.rideId || res.data?.rideId || res.data?.ride?._id || res.data?._id;
      if (id) setRideId(id);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to request this ride. Please check the trip details and try again.';
      console.warn("Ride request error:", message);
      setRideState('negotiating');
      Alert.alert('Ride request failed', message);
    }
  };

  const handleCancel = async () => {
    if (rideId && (rideState === "searching" || rideState === "accepted")) {
      try { await ridesApi.cancelRide(rideId); } catch (e) {}
    }
    setRideState("idle");
    setDestinationLoc(null);
    setDestination("");
    setSearchQuery("");
    setRideId(null);
    setAcceptedDriver(null);
  };

  const handleMapPress = async (e: any) => {
    if (rideState === "idle" || rideState === "estimating") {
      const coords = e.nativeEvent.coordinate;
      setDestinationLoc(coords);
      try {
        let geocode = await Location.reverseGeocodeAsync(coords);
        if (geocode && geocode.length > 0) {
          const locStr = `${geocode[0].name || geocode[0].street || "Selected Location"}, ${geocode[0].city || ""}`;
          setDestination(locStr);
          setSearchQuery(locStr);
        } else {
          setDestination("Selected on map");
          setSearchQuery("Selected on map");
        }
      } catch (err) {
        setDestination("Selected on map");
        setSearchQuery("Selected on map");
      }
    }
  };

  const handleMotorPress = (motor: any) => {
    if (rideState === "idle") {
      setRideState("negotiating");
    }
  };

  const handlePoiClick = (e: any) => {
    if (rideState === "idle" || rideState === "estimating") {
      const { coordinate, name } = e.nativeEvent;
      setDestinationLoc(coordinate);
      setDestination(name || "Selected Location");
      setSearchQuery(name || "Selected Location");
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=rw&limit=5`, {
        headers: {
          'User-Agent': 'MotaRideApp/1.0',
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (e) {
      console.log("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (place: any) => {
    const name = place.display_name.split(',')[0];
    setDestination(name);
    setSearchQuery(name);
    setDestinationLoc({
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon)
    });
    setSearchResults([]);
  };

  const s = styles(colors, isDark);

  return (
    <View style={s.container}>
      {/* 1. Map View */}
      <MapView
        key={mapProvider}
        provider={mapProvider === 'google' ? PROVIDER_GOOGLE : undefined}
        mapType="standard"
        style={s.map}
        initialRegion={{
          latitude: pickupLoc.latitude,
          longitude: pickupLoc.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        loadingEnabled
        loadingBackgroundColor="#E5E7EB"
        loadingIndicatorColor={colors.primary}
        moveOnMarkerPress={false}
        showsCompass
        showsUserLocation={true}
        showsMyLocationButton={false}
        onMapReady={() => { setMapReady(true); setMapError(null); }}
        onMapLoaded={() => { setMapReady(true); setMapError(null); }}
        onPress={handleMapPress}
        onPoiClick={handlePoiClick}
      >
        {mapProvider === 'openstreetmap' ? <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" minimumZ={1} maximumZ={19} tileSize={256} flipY={false} zIndex={1} opacity={1} /> : null}
        {/* Destination Marker */}
        {destinationLoc && (
          <Marker coordinate={destinationLoc}>
            <View style={s.destMarker}>
              <Feather name="map-pin" size={28} color={colors.primary} />
            </View>
          </Marker>
        )}

        {/* Search Result Markers on Map */}
        {searchResults.map((item, idx) => (
          <Marker
            key={`sr-${idx}`}
            coordinate={{ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }}
            onPress={() => handleSelectPlace(item)}
          >
            <View style={s.searchResultMarker}>
              <Feather name="tag" size={20} color="#fff" />
            </View>
          </Marker>
        ))}

        {/* Directions Polyline */}
        {routeCoordinates.length > 1 ? <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor={colors.primary} /> : null}

        {/* Driver in Progress Marker */}
        {rideState === "accepted" ? (
          <Marker coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }}>
            <View style={s.scooterMarker}>
              <View style={s.scooterMarkerCircle}>
                <Text style={{fontSize: 16}}>🏍️</Text>
              </View>
              <View style={s.scooterMarkerTriangle} />
            </View>
          </Marker>
        ) : (
          /* Available Drivers */
          !destinationLoc && availableMotors.map((motor) => (
            <Marker key={motor.id} coordinate={{ latitude: motor.lat, longitude: motor.lng }} onPress={() => handleMotorPress(motor)}>
              <View style={s.scooterMarker}>
                <View style={s.scooterMarkerCircle}>
                  <Text style={{fontSize: 16}}>🏍️</Text>
                </View>
                <View style={s.scooterMarkerTriangle} />
              </View>
            </Marker>
          ))
        )}

        {/* User Location Marker */}
        <Marker coordinate={pickupLoc} anchor={{x: 0.5, y: 0.5}}>
          <View style={s.userMarkerHalo}>
            <View style={s.userMarkerDot} />
          </View>
        </Marker>
      </MapView>
      {!mapReady ? <View pointerEvents="none" style={s.mapLoading}><ActivityIndicator color={colors.primary} /><Text style={s.mapLoadingText}>Loading {mapProvider === 'openstreetmap' ? 'Server 1' : 'Server 2'} map…</Text></View> : null}
      {mapError ? <TouchableOpacity style={s.mapError} onPress={() => { setMapError(null); setMapReady(false); setMapProvider(current => current === 'google' ? 'openstreetmap' : 'google'); }}><Text style={s.mapErrorText}>{mapError} • switch server</Text></TouchableOpacity> : null}
      <View style={s.mapServerSwitch}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Use map server 1 OpenStreetMap" onPress={() => { setMapReady(false); setMapError(null); setMapProvider('openstreetmap'); }} style={[s.serverButton, mapProvider === 'openstreetmap' && s.serverButtonActive]}><Text style={[s.serverButtonText, mapProvider === 'openstreetmap' && s.serverButtonTextActive]}>Server 1</Text><Text style={[s.serverCaption, mapProvider === 'openstreetmap' && s.serverButtonTextActive]}>OpenMap</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Use map server 2 Google Maps" onPress={() => { setMapReady(false); setMapError(null); setMapProvider('google'); }} style={[s.serverButton, mapProvider === 'google' && s.serverButtonActive]}><Text style={[s.serverButtonText, mapProvider === 'google' && s.serverButtonTextActive]}>Server 2</Text><Text style={[s.serverCaption, mapProvider === 'google' && s.serverButtonTextActive]}>Google</Text></TouchableOpacity>
      </View>
      {mapProvider === 'openstreetmap' ? <Text style={s.mapAttribution}>© OpenStreetMap contributors</Text> : null}

      {/* 2. Top Overlays */}
      {rideState === 'accepted' ? (
        <View style={[s.topNavBanner, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={handleCancel} style={s.backBtnNav}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
             <Text style={s.navTitle}>Ride in progress</Text>
             <Text style={s.navSubtitle}>Heading to destination</Text>
          </View>
        </View>
      ) : (
        <View style={[s.topOverlay, { top: insets.top + 16, flexDirection: 'column', gap: 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <TouchableOpacity style={s.profilePic} onPress={() => router.push("/(passenger)/profile")}>
              <Text style={{fontSize: 20}}>👨🏽</Text>
            </TouchableOpacity>
            <View style={s.locationTopBox}>
              <Feather name="navigation" size={14} color={colors.primary} />
              <View style={{ marginLeft: 6 }}>
                <Text style={s.locationTopLabel}>Your location</Text>
                <Text style={s.locationTopText}>{locationName}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.menuBtnTop} onPress={() => router.push("/(passenger)/rides")}>
              <Feather name="grid" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          {locationStatus !== "granted" && (
            <View style={{
              backgroundColor: '#F59E0B',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              width: '100%',
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3
            }}>
              <Feather name="alert-triangle" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold', flex: 1 }}>
                {locationStatus === 'denied'
                  ? "GPS Permission denied. Enable location permissions in settings."
                  : "GPS Location is turned off. Turn on location for real-time tracking."}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 3. Bottom Sheet */}
      <View style={s.bottomSheetWrapper}>
        <LinearGradient 
          colors={[colors.primary, isDark ? '#7f1d1d' : '#991b1b']} 
          style={[s.bottomSheetGradient, { paddingBottom: Math.max(insets.bottom, 24) }]}
        >
          <View style={s.sheetHandle} />

          {rideState === "idle" && (
            <View style={s.idleState}>
              <Text style={s.greetingText}>Hello there, {user?.firstName || 'Passenger'}! 👋</Text>
              
              <View style={s.vehicleCardsRow}>
                <TouchableOpacity 
                  style={[s.vehicleCard, vehicleType === "car" && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}15` }]} 
                  onPress={() => setVehicleType("car")}
                >
                   <Text style={{fontSize:40, marginBottom: 8}}>🚗</Text>
                   <Text style={s.vcTitle}>Cars</Text>
                   <Text style={s.vcSub}>Ride with favorite car</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.vehicleCard, vehicleType === "motor" && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}15` }]} 
                  onPress={() => setVehicleType("motor")}
                >
                   <Text style={{fontSize:40, marginBottom: 8}}>🏍️</Text>
                   <Text style={s.vcTitle}>Motors</Text>
                   <Text style={s.vcSub}>Ride with favorite motor</Text>
                </TouchableOpacity>
              </View>

              {vehicleType !== null && (
                <View style={[s.searchBarContainer, { zIndex: 99 }]}>
                  <View style={s.searchBarInputBox}>
                    <Feather name="search" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                    <TextInput 
                      style={[s.searchInput, { flex: 1 }]}
                      placeholder="Where are you going?"
                      placeholderTextColor="#9CA3AF"
                      value={searchQuery}
                      onChangeText={(text) => setSearchQuery(text)}
                      onSubmitEditing={() => handleSearch(searchQuery)}
                      returnKeyType="search"
                    />
                    {isSearching ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <TouchableOpacity onPress={() => handleSearch(searchQuery)} style={s.searchBtn}>
                        <Text style={s.searchBtnText}>Search</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {searchResults.length > 0 && (
                    <ScrollView 
                      style={s.dropdownList} 
                      keyboardShouldPersistTaps="handled" 
                      nestedScrollEnabled={true}
                    >
                      {searchResults.map((item, idx) => (
                        <TouchableOpacity key={idx} style={s.dropdownItem} onPress={() => handleSelectPlace(item)}>
                          <View style={s.dropdownIcon}>
                            <Feather name="map-pin" size={14} color="#fff" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.dropdownTitle} numberOfLines={1}>{item.display_name.split(',')[0]}</Text>
                            <Text style={s.dropdownSub} numberOfLines={1}>{item.display_name.split(',').slice(1).join(',').trim()}</Text>
                          </View>
                          <Feather name="arrow-up-left" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  
                  {destinationLoc && searchResults.length === 0 && searchQuery.length > 0 && (
                    <TouchableOpacity style={[s.primaryBtn, { marginTop: 16 }]} onPress={() => setRideState("estimating")}>
                      <Feather name="check-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={s.primaryBtnText}>Confirm Location</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {rideState === "estimating" && (
            <View style={s.cardStack}>
              <View style={s.whiteCard}>
                <Text style={s.estimateTitle}>Confirm Ride to {destination.split(',')[0]}</Text>
                <Text style={s.suggestedText}>Suggested Fare: {minFare.toLocaleString()} RWF</Text>
                <TouchableOpacity style={s.primaryBtn} onPress={() => setRideState("negotiating")}>
                  <Text style={s.primaryBtnText}>Proceed</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {rideState === "negotiating" && (
            <View style={s.cardStack}>
              {/* Vehicle Detail Card */}
              <View style={s.whiteCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <View>
                     <Text style={s.cardTitle}>MOTA Standard</Text>
                     <Text style={s.cardSub}>🏍️ {distanceKm} Km Distance</Text>
                   </View>
                   <Text style={{fontSize: 40}}>🏍️</Text>
                </View>
                
                <View style={s.negotiatorRow}>
                  <TouchableOpacity style={s.negBtn} onPress={() => adjustOffer(-100)}>
                    <Feather name="minus" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput 
                      style={s.negAmountInput}
                      value={offer.toString()}
                      onChangeText={(val) => {
                         const num = parseInt(val, 10);
                         if (!isNaN(num)) setOffer(num);
                         else if (val === "") setOffer(0);
                      }}
                      keyboardType="numeric"
                    />
                    <Text style={s.negCurrency}> RWF</Text>
                  </View>
                  <TouchableOpacity style={s.negBtn} onPress={() => adjustOffer(100)}>
                    <Feather name="plus" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={s.passengerRow}>
                  <Text style={s.cardTitle}>Passengers</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity style={s.negBtnSmall} onPress={() => setPassengers(Math.max(1, passengers - 1))}>
                      <Feather name="minus" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold' }}>{passengers}</Text>
                    <TouchableOpacity style={s.negBtnSmall} onPress={() => setPassengers(passengers + 1)}>
                      <Feather name="plus" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Schedule Date & Time Card */}
              <View style={[s.whiteCard, { marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="clock" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={s.cardTitle}>Schedule Ride</Text>
                  </View>
                  <TouchableOpacity 
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: isScheduled ? `${colors.primary}20` : '#F3F4F6'
                    }}
                    onPress={() => setIsScheduled(!isScheduled)}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: isScheduled ? colors.primary : '#6B7280' }}>
                      {isScheduled ? "Scheduled" : "Ride Now"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isScheduled && (
                  <View style={{ gap: 12, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6B7280', marginBottom: 4 }}>Date</Text>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            fontFamily: 'Inter_500Medium'
                          }}
                          placeholder="e.g. 2026-09-02"
                          value={scheduledDate}
                          onChangeText={setScheduledDate}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6B7280', marginBottom: 4 }}>Time</Text>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            fontFamily: 'Inter_500Medium'
                          }}
                          placeholder="e.g. 02:30 PM"
                          value={scheduledTime}
                          onChangeText={setScheduledTime}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
              
              {/* Payment Card */}
              <View style={[s.whiteCard, { marginTop: 12 }]}>
                 <TouchableOpacity style={s.payRow} onPress={() => setPaymentMethod('cash')}>
                    <Text style={{fontSize: 20, marginRight: 12}}>💵</Text>
                    <Text style={[s.payText, paymentMethod === 'cash' && {color: colors.primary, fontFamily: 'Inter_700Bold'}]}>Cash Payment</Text>
                    {paymentMethod === 'cash' && <Feather name="check-circle" size={20} color={colors.primary} style={{marginLeft: 'auto'}} />}
                 </TouchableOpacity>
                 <TouchableOpacity style={[s.payRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 12, paddingTop: 12 }]} onPress={() => setPaymentMethod('momo')}>
                    <Text style={{fontSize: 20, marginRight: 12}}>📱</Text>
                    <Text style={[s.payText, paymentMethod === 'momo' && {color: colors.primary, fontFamily: 'Inter_700Bold'}]}>MoMo / Airtel Money</Text>
                    {paymentMethod === 'momo' && <Feather name="check-circle" size={20} color={colors.primary} style={{marginLeft: 'auto'}} />}
                 </TouchableOpacity>
              </View>

              <TouchableOpacity style={s.primaryBtn} onPress={handleRequestRide}>
                <Text style={s.primaryBtnText}>Start ride</Text>
              </TouchableOpacity>
            </View>
          )}

          {rideState === "searching" && waitingMinimized && (
            <TouchableOpacity style={[s.whiteCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setWaitingMinimized(false)}>
              <View><Text style={s.cardTitle}>Finding your rider…</Text><Text style={s.cardSub}>{searchTimer}s elapsed • tap to expand</Text></View>
              <ActivityIndicator color={colors.primary} />
            </TouchableOpacity>
          )}

          {rideState === "searching" && !waitingMinimized && (
            <View style={[s.whiteCard, { alignItems: 'center', paddingVertical: 32 }]}> 
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Minimize rider search" onPress={() => setWaitingMinimized(true)} style={{ alignSelf: 'flex-end', padding: 8 }}><Feather name="minus" size={22} color={colors.textPrimary} /></TouchableOpacity>
              <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
              <Text style={s.cardTitle}>Waiting for a rider...</Text>
              <Text style={s.cardSub}>
                {searchTimer < 60 ? `${searchTimer}s` : `${Math.floor(searchTimer/60)}m ${searchTimer%60}s`} elapsed
              </Text>
              <Text style={{ marginTop: 16, marginBottom: 8, textAlign: 'center', color: '#6B7280', paddingHorizontal: 20, fontSize: 14, fontFamily: 'Inter_500Medium' }}>
                Your ride request has been sent to nearby riders. We will call you when a rider accepts your ride.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#ECFDF5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}>
                <Feather name="phone" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>You'll receive a call notification</Text>
              </View>
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#F3F4F6', width: '100%' }]} onPress={handleCancel}>
                <Text style={[s.primaryBtnText, { color: '#111827' }]}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          )}

          {rideState === "accepted" && (
            <View style={s.cardStack}>
              <View style={s.whiteCard}>
                 <Text style={s.cardTitle}>Driver: {acceptedDriver?.firstName || 'Your Rider'} {acceptedDriver?.lastName || ''}</Text>
                 <Text style={s.cardSub}>Plate: {acceptedDriver?.plate || 'N/A'} • {vehicleType === 'car' ? '🚗' : '🏍️'} MOTA {vehicleType === 'car' ? 'Car' : 'Standard'}</Text>
                 <Text style={[s.cardSub, { marginTop: 8 }]}>Destination: {destination}</Text>
                 
                 <View style={s.statsRow}>
                   <View style={s.statItem}>
                     <Feather name="clock" size={16} color="#111827" />
                     <Text style={s.statText}>{etaMin} min</Text>
                   </View>
                   <View style={s.statItem}>
                     <Feather name="map-pin" size={16} color="#111827" />
                     <Text style={s.statText}>{distanceKm} km</Text>
                   </View>
                   <View style={s.statItem}>
                     <Feather name="users" size={16} color="#111827" />
                     <Text style={s.statText}>{passengers}</Text>
                   </View>
                 </View>

                 {serverRideStatus === 'start_requested' && <TouchableOpacity style={[s.primaryBtn, { marginTop: 18 }]} onPress={async () => { if (rideId) await ridesApi.confirmStart(rideId); }}><Text style={s.primaryBtnText}>Confirm Start Ride</Text></TouchableOpacity>}
                 {serverRideStatus === 'stop_requested' && <TouchableOpacity style={[s.primaryBtn, { marginTop: 18 }]} onPress={async () => { if (rideId) { await ridesApi.confirmStop(rideId); setServerRideStatus('awaiting_payment'); } }}><Text style={s.primaryBtnText}>Confirm Destination Reached</Text></TouchableOpacity>}
                 {serverRideStatus === 'awaiting_payment' && <TouchableOpacity 
                   style={[s.primaryBtn, { marginTop: 24 }]} 
                   onPress={async () => {
                     try {
                       if (paymentMethod === 'momo') {
                         if (!rideId) throw new Error('Ride not found');
                         await ridesApi.payRide(rideId);
                       }
                       const msg = paymentMethod === 'momo' 
                          ? `Your payment request of ${offer} RWF via MoMo (Paypack API) has been successfully initiated!` 
                          : `You have opted to pay ${offer} RWF in Cash to the driver.`;
                       Alert.alert("Payment Info", msg + " The ride is ready to start.");
                     } catch (err: any) {
                       Alert.alert("Payment Error", err?.response?.data?.message || "Could not request payment via MoMo.");
                     }
                   }}
                 >
                   <Text style={s.primaryBtnText}>
                     {paymentMethod === 'momo' ? `Pay ${offer} RWF (MoMo)` : `Pay ${offer} RWF (Cash)`}
                   </Text>
                 </TouchableOpacity>}

                 <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                   <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: '#F3F4F6', marginTop: 0 }]} onPress={handleCancel}>
                     <Text style={[s.primaryBtnText, { color: '#111827' }]}>Pause</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={[s.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: '#EF4444' }]} onPress={handleCancel}>
                     <Text style={s.primaryBtnText}>End ride</Text>
                   </TouchableOpacity>
                 </View>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}

// Light theme map style to match the clean aesthetic
const mapStyleLight = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
];

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  map: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#E5E7EB' },
  mapLoading: { position: 'absolute', top: '38%', alignSelf: 'center', flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, zIndex: 8 },
  mapLoadingText: { color: '#111827', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  mapError: { position: 'absolute', top: '45%', alignSelf: 'center', backgroundColor: '#991B1B', borderRadius: 12, padding: 12, zIndex: 20 },
  mapErrorText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  mapServerSwitch: { position: 'absolute', top: 98, right: 16, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 14, padding: 4, zIndex: 50, elevation: 10 },
  serverButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, alignItems: 'center', minWidth: 74 },
  serverButtonActive: { backgroundColor: '#111827' },
  serverButtonText: { color: '#111827', fontFamily: 'Inter_700Bold', fontSize: 12 },
  serverButtonTextActive: { color: '#fff' },
  serverCaption: { color: '#6B7280', fontFamily: 'Inter_500Medium', fontSize: 9, marginTop: 1 },
  mapAttribution: { position: 'absolute', right: 8, bottom: 4, color: '#374151', backgroundColor: 'rgba(255,255,255,0.75)', fontSize: 9, paddingHorizontal: 4, zIndex: 5 },
  
  // Top Navigation
  topNavBanner: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.primary, zIndex: 10, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  backBtnNav: { padding: 8 },
  navTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  navSubtitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Top Overlay (Idle)
  topOverlay: { position: 'absolute', left: 20, right: 20, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profilePic: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  locationTopBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  locationTopLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#6B7280' },
  locationTopText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#111827' },
  menuBtnTop: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },

  // Custom Markers
  userMarkerHalo: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(139, 92, 246, 0.2)', alignItems: 'center', justifyContent: 'center' },
  userMarkerDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#6366F1', borderWidth: 4, borderColor: '#fff' },
  
  scooterMarker: { alignItems: 'center' },
  scooterMarkerCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
  scooterMarkerTriangle: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.primary, marginTop: -2 },

  destMarker: { alignItems: 'center', justifyContent: 'center' },
  destMarkerInner: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#111827', borderWidth: 4, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },

  // Bottom Sheet
  bottomSheetWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomSheetGradient: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 16, paddingHorizontal: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 2, alignSelf: "center", marginBottom: 24 },
  
  idleState: { paddingBottom: 10 },
  greetingText: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 20 },
  vehicleCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  vehicleCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  vcTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#111827' },
  vcSub: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6B7280', marginTop: 4 },
  
  searchBarContainer: { width: '100%', marginBottom: 10 },
  searchBarInputBox: { backgroundColor: '#fff', height: 60, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: '#111827' },
  searchBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginLeft: 8 },
  searchBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  dropdownList: { backgroundColor: '#fff', borderRadius: 16, marginTop: 8, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, maxHeight: 280 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dropdownTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827' },
  dropdownSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9CA3AF', marginTop: 2 },
  dropdownText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: '#111827' },

  searchResultMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },

  cardStack: { paddingBottom: 10 },
  whiteCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  cardTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827' },
  cardSub: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#6B7280', marginTop: 4 },
  
  estimateTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  suggestedText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.primary, textAlign: 'center', marginBottom: 20 },

  negotiatorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 20 },
  negBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" },
  negBtnSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" },
  negAmountInput: { fontSize: 36, fontFamily: "Inter_700Bold", color: '#111827', minWidth: 100, textAlign: 'center', padding: 0 },
  negCurrency: { fontSize: 22, fontFamily: "Inter_700Bold", color: '#111827' },
  
  passengerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },

  payRow: { flexDirection: 'row', alignItems: 'center' },
  payText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: '#111827' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' },

  primaryBtn: { backgroundColor: colors.primary, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginTop: 24, flexDirection: 'row' },
  primaryBtnText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
});
