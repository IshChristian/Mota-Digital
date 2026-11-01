import { Alert, showMessage } from "@/components/GlobalAlert";
import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ridesApi } from "@/services/api";
import { startDriverTracking, stopBackgroundTracking } from "@/services/driverLocation";
import { useRealtimeEvent } from "@/hooks/useRealtime";
import { RideRequestModal } from "@/components/RideRequestModal";

export default function TabLayout() {
  const router = useRouter();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const t = useT();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState<
    "granted" | "denied" | "off"
  >("granted");
  const requestSound = useAudioPlayer(
    "https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav",
  );

  // Play loud notification sound when incoming request arrives
  const playLoudNotificationSound = async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "duckOthers",
      });
      requestSound.volume = 1;
      await requestSound.seekTo(0);
      requestSound.play();
    } catch (e) {
      console.log("Error playing notification sound:", e);
    }
  };

  // Location sharing: background updates while online or on a ride (keeps
  // working with the screen locked); foreground-only if background is refused.
  const shouldTrack = Boolean(user?.isOnline);
  useEffect(() => {
    if (!shouldTrack) { void stopBackgroundTracking(); return; }
    let stop = () => {};
    let cancelled = false;
    startDriverTracking().then((result) => {
      if (cancelled) { result.stop(); return; }
      stop = result.stop;
      setLocationStatus(result.mode === "denied" ? "denied" : result.mode === "off" ? "off" : "granted");
      if (result.mode === "foreground") {
        Alert.alert("Allow location \"All the time\"", "MOTA can only share your position while the app is open. Choose \"Allow all the time\" in Settings so passengers can track you with the screen locked.");
      }
    }).catch(() => setLocationStatus("off"));
    return () => { cancelled = true; stop(); };
  }, [shouldTrack]);

  // Ride offers arrive on the shared live connection.
  useRealtimeEvent("ride_request", (request) => {
    setIncomingRequest(request);
    void playLoudNotificationSound();
  });
  useRealtimeEvent("rideAssigned", (data) => {
    setIncomingRequest(null);
    requestSound.pause();
    if (data?.rideId) router.push({ pathname: "/active-ride", params: { rideId: String(data.rideId) } } as any);
  });
  useRealtimeEvent("ride_request_closed", (data) => {
    setIncomingRequest((current: any) => {
      if (current && String(current.id ?? current.rideId) === String(data?.rideId)) { requestSound.pause(); return null; }
      return current;
    });
  });

  const handleAcceptRide = async (id: string) => {
    try {
      requestSound.pause();
      await ridesApi.acceptRide(id);
      setIncomingRequest(null);
      router.push({ pathname: "/active-ride", params: { rideId: id } } as any);
    } catch (e: any) {
      console.error("Failed to accept ride", e);
      try {
        const current = (await ridesApi.getRideStatus(id)).data;
        if (
          current?.driverId &&
          [
            "accepted",
            "approaching",
            "arrived",
            "start_requested",
            "in_progress",
            "stop_requested",
            "awaiting_payment",
          ].includes(current.rideStatus)
        ) {
          setIncomingRequest(null);
          router.push({
            pathname: "/active-ride",
            params: { rideId: id },
          } as any);
          return;
        }
      } catch {
        /* Use the API message below. */
      }
      showMessage(
        e?.response?.data?.message ||
          "Unable to accept this ride. Refresh to see its current timeline.",
      );
      setIncomingRequest(null);
    }
  };

  const handleDeclineRide = async (id: string) => {
    try {
      requestSound.pause();
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
        <View
          style={{
            backgroundColor: "#F59E0B",
            paddingTop: safeAreaInsets.top + 6,
            paddingBottom: 8,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 999,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Feather
              name="alert-triangle"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: "#fff",
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                flex: 1,
              }}
            >
              {locationStatus === "denied"
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
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: colors.tabBarBg },
                ]}
              />
            ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("dashboard"),
            tabBarIcon: ({ color }) => (
              <Feather name="home" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: "Requests",
            tabBarIcon: ({ color }) => (
              <Feather name="radio" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: t("wallet"),
            tabBarIcon: ({ color }) => (
              <Feather name="credit-card" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("profile"),
            tabBarIcon: ({ color }) => (
              <Feather name="user" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="finance" options={{ href: null }} />
        <Tabs.Screen name="kyc" options={{ href: null }} />
        <Tabs.Screen name="rides" options={{ href: null }} />
        <Tabs.Screen name="savings" options={{ href: null }} />
      </Tabs>

      <RideRequestModal
        request={incomingRequest}
        onAccept={handleAcceptRide}
        onDecline={handleDeclineRide}
      />
    </View>
  );
}
