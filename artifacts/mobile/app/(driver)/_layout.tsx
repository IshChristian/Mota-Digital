import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View, Text, Alert, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EventSource from "react-native-sse";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, ridesApi, driverApi } from "@/services/api";
import { RideRequestModal } from "@/components/RideRequestModal";

export default function TabLayout() {
  const router = useRouter();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const t = useT();
  const { colors, isDark } = useTheme();
  const { token, user } = useAuth();
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState<"granted" | "denied" | "off">("granted");
  const [soundObject, setSoundObject] = useState<Audio.Sound | null>(null);

  // Play loud notification sound when incoming request arrives
  const playLoudNotificationSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav' },
        { shouldPlay: true, volume: 1.0 }
      );
      setSoundObject(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.log("Error playing notification sound:", e);
    }
  };

  // Real-time GPS Location tracking for Driver
  useEffect(() => {
    let sub: any;
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationStatus('denied');
          Alert.alert(
            "GPS Permission Required",
            "Please allow GPS location access to receive nearby passenger ride requests."
          );
          return;
        }

        let isServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!isServicesEnabled) {
          setLocationStatus('off');
          Alert.alert(
            "GPS Services Disabled",
            "Please turn on location services on your device to receive ride requests."
          );
        } else {
          setLocationStatus('granted');
        }

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10 },
          (loc) => {
            setLocationStatus('granted');
            try {
              driverApi.updateLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
            } catch (e) {}
          }
        );
      } catch (err) {
        setLocationStatus('off');
      }
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    // Use SSE for real-time ride requests
    const url = `${API_BASE_URL.replace('/api', '')}/realtime/driver-events`;
    const es = new EventSource(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // @ts-ignore
    es.addEventListener("ride_request", (event: any) => {
      if (event.data) {
        try {
          const req = JSON.parse(event.data);
          setIncomingRequest(req);
          playLoudNotificationSound();
        } catch (e) {
          console.error("Failed to parse ride_request", e);
        }
      }
    });

    return () => {
      es.removeAllEventListeners();
      es.close();
    };
  }, [token]);

  const handleAcceptRide = async (id: string) => {
    try {
      if (soundObject) {
        await soundObject.unloadAsync();
      }
      await ridesApi.acceptRide(id);
      setIncomingRequest(null);
      router.push({ pathname: "/active-ride", params: { rideId: id } } as any);
    } catch (e) {
      console.error("Failed to accept ride", e);
      alert("Failed to accept ride. It may have been taken by another driver.");
      setIncomingRequest(null);
    }
  };

  const handleDeclineRide = async (id: string) => {
    try {
      if (soundObject) {
        await soundObject.unloadAsync();
      }
      await ridesApi.declineRide(id);
    } catch (e) {
      console.error("Failed to decline ride", e);
    } finally {
      setIncomingRequest(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {locationStatus !== "granted" && (
        <View style={{
          backgroundColor: '#F59E0B',
          paddingTop: safeAreaInsets.top + 6,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 999
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Feather name="alert-triangle" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold', flex: 1 }}>
              {locationStatus === 'denied'
                ? "GPS permission denied. Enable location permissions to receive rides."
                : "GPS Location is turned off. Turn on location for real-time ride matching."}
            </Text>
          </View>
        </View>
      )}
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 80 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarBg }]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("dashboard"),
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color }) => <Feather name="radio" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: t("rides"),
          href: "/log-ride",
          tabBarIcon: ({ color }) => <Feather name="map-pin" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t("wallet"),
          tabBarIcon: ({ color }) => <Feather name="credit-card" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: "Savings",
          tabBarIcon: ({ color }) => <Feather name="pocket" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
    
    <RideRequestModal
      request={incomingRequest}
      onAccept={handleAcceptRide}
      onDecline={handleDeclineRide}
    />
    </View>
  );
}
