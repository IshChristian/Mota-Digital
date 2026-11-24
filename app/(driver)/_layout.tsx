import { Alert, showMessage } from "@/components/GlobalAlert";
import { BlurView } from "expo-blur";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { stopRideAlert } from "@/services/rideAlert";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ridesApi, getApiErrorMessage } from "@/services/api";
import { startDriverTracking, stopBackgroundTracking } from "@/services/driverLocation";
import { canTrackDriverLocation } from "@/services/driverLocationTracking";
import { useRealtimeEvent } from "@/hooks/useRealtime";
import { useRideOffers } from "@/hooks/useRideOffers";
import { offerId } from "@/utils/rideOffers";
import { RideRequestModal } from "@/components/RideRequestModal";
import { pageFrame, useWideLayout } from "@/hooks/useWideLayout";

// A raised price is worth showing again, so "Later" covers a request at its current fare only.
const laterKey = (offer: any) => `${offerId(offer)}:${offer.offeredFare}`;

export default function TabLayout() {
  const router = useRouter();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  // Wide browsers: a left sidebar instead of the phone's bottom tab bar.
  const { wide } = useWideLayout();
  const safeAreaInsets = useSafeAreaInsets();
  const t = useT();
  const { colors, isDark } = useTheme();
  const { token, user } = useAuth();
  const [locationStatus, setLocationStatus] = useState<
    "granted" | "denied" | "off"
  >("granted");
  useEffect(() => () => stopRideAlert(), []);

  // Location sharing: background updates while online or on a ride (keeps
  // working with the screen locked); foreground-only if background is refused.
  // Only signed-in, activated drivers who are online publish GPS (the server refuses the rest).
  const shouldTrack = Boolean(user?.isOnline) && canTrackDriverLocation(user, token);
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

  // Every open request is kept; one is shown at a time and new ones queue behind it.
  const { offers, close, clear, refresh } = useRideOffers(Boolean(user?.isOnline));
  const [shownId, setShownId] = useState<string | null>(null);
  const [later, setLater] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState("");
  const pathname = usePathname();
  // These screens already show the request or the trip.
  const answering = pathname.startsWith("/ride-request") || pathname.startsWith("/active-ride");
  useEffect(() => { void refresh(); }, [answering, refresh]);

  const waiting = offers.filter((offer) => !later.has(laterKey(offer)));
  const index = Math.max(0, waiting.findIndex((offer) => offerId(offer) === shownId));
  const shown = answering ? null : waiting[index] ?? null;
  const currentId = shown ? offerId(shown) : null;
  // Stay on the request being read when others arrive or close.
  useEffect(() => { if (currentId) setShownId(currentId); }, [currentId]);
  useEffect(() => { if (!waiting.length) setNotice(""); }, [waiting.length]);

  useRealtimeEvent("rideAssigned", (data) => {
    clear();
    stopRideAlert();
    if (data?.rideId) router.push({ pathname: "/active-ride", params: { rideId: String(data.rideId) } } as any);
  });

  const openRide = (id: string) => {
    clear();
    setNotice("");
    router.push({ pathname: "/active-ride", params: { rideId: id } } as any);
  };

  const handleAcceptRide = async (id: string) => {
    stopRideAlert();
    setNotice("");
    try {
      await ridesApi.acceptRide(id);
      openRide(id);
    } catch (e: any) {
      try {
        // The reply may have been lost after the ride was given to this driver.
        const current = (await ridesApi.getRideStatus(id)).data;
        if (String(current?.driverId?._id ?? current?.driverId ?? "") === String(user?.id) &&
          ["accepted", "approaching", "arrived", "start_requested", "in_progress", "stop_requested", "awaiting_payment"].includes(current.rideStatus)) {
          openRide(id);
          return;
        }
      } catch { /* Use the API message below. */ }
      const message = e?.response?.data?.message || getApiErrorMessage(e) || t("drive.request_gone");
      // A refusal means it is gone; a lost connection keeps it so the driver can try again.
      const gone = e?.response?.status >= 400 && e?.response?.status < 500 && e.response.status !== 429;
      const others = waiting.length > 1;
      if (gone) close(id);
      if (others || !gone) setNotice(message);
      else setTimeout(() => showMessage(message), 400); // after the alert has closed: two modals cannot open together
    }
  };

  // Answered at once; the server is told in the background so the next request is not held up.
  const handleDeclineRide = async (id: string) => {
    setNotice("");
    close(id);
    ridesApi.declineRide(id).catch((e) => console.warn("Declining the ride failed", getApiErrorMessage(e)));
  };

  const handleLater = () => {
    stopRideAlert();
    setNotice("");
    setLater(new Set(offers.map(laterKey)));
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
          tabBarPosition: wide ? "left" : "bottom",
          tabBarVariant: wide ? "material" : "uikit",
          sceneStyle: [{ backgroundColor: colors.background }, pageFrame(wide, 960)],
          tabBarLabelStyle: wide ? { fontFamily: "Inter_600SemiBold", fontSize: 14 } : undefined,
          tabBarStyle: wide ? {
            backgroundColor: colors.tabBarBg,
            borderRightWidth: 1,
            borderRightColor: colors.tabBarBorder,
            width: 220,
            // The sidebar otherwise takes Material's 360px minimum, half of a small laptop screen.
            minWidth: 0,
            paddingTop: 16,
            paddingHorizontal: 8,
          } : {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.tabBarBg,
            borderTopWidth: 1,
            borderTopColor: colors.tabBarBorder,
            elevation: 0,
            paddingBottom: safeAreaInsets.bottom,
            ...(isWeb ? { height: 64 } : {}),
          },
          tabBarBackground: () =>
            wide ? null : isIOS ? (
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
            sceneStyle: { backgroundColor: colors.background },
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
            sceneStyle: [{ backgroundColor: colors.background }, pageFrame(wide, 1120)],
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
        request={shown}
        index={index}
        total={waiting.length}
        onMove={(step) => setShownId(offerId(waiting[index + step] ?? waiting[index]))}
        onLater={handleLater}
        notice={notice}
        onAccept={handleAcceptRide}
        onDecline={handleDeclineRide}
      />
    </View>
  );
}
