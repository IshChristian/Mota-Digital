import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Image, View } from "react-native";
import { Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { isPassengerRole, normalizeRole } from "@/constants/roles";
import { PrivacyConsentBanner } from "@/components/PrivacyConsentBanner";
import { ReleaseNotice } from "@/components/ReleaseNotice";
import { GlobalAlert } from "@/components/GlobalAlert";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isAccountReady, accountError, refreshAccount, logout, user } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (isLoading || (isAuthenticated && !isAccountReady)) return;
    if (segments[0] === "info") return;

    if (segments[0] !== "info" && isAuthenticated && user?.role !== "driver" && user?.isVerified === true && user?.isActive === false) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isPublicInformation =
      ["info", "system"].includes(segments[0]) ||
      segments[0] === "+not-found";
    const isPassenger = isPassengerRole(user?.role);

    const needsPhoneVerification = isAuthenticated && user?.isVerified === false;
    const needsDriverReview = isAuthenticated && user?.role === "driver" &&
      (user.isVerified !== true || user.isActive !== true || user.registrationPaid !== true || user.registrationStatus !== "approved" || user.kycLevel !== "full");

    if (!isAuthenticated && !inAuthGroup && !isPublicInformation) {
      router.replace("/(auth)/welcome" as any);
    } else if (isAuthenticated) {
      if (needsPhoneVerification && user?.role !== "driver") {
        if (segments[1] !== "otp" && segments[1] !== "confirm-phone") router.replace("/(auth)/confirm-phone");
      } else if (needsDriverReview) {
        const allowed = (segments[0] === "(auth)" && ["verification-progress", "confirm-phone", "otp", "verify-email", "driver-kyc", "payment-registration"].includes(segments[1])) ||
          (segments[0] === "(driver)" && segments[1] === "kyc");
        if (!allowed) router.replace("/(auth)/verification-progress" as any);
      } else {
        // Fully onboarded — route to the appropriate home screen
        if (inAuthGroup && segments[1] !== "verify-email") {
          const role = normalizeRole(user?.role);
          if (role === "admin") router.replace("/(admin)" as any);
          else if (role === "agent") router.replace("/(agent)" as any);
          else if (role === "client") router.replace("/(passenger)" as any);
          else router.replace("/(driver)" as any);
        }
      }
    }
  }, [isAuthenticated, isLoading, isAccountReady, segments, user]);

  if (segments[0] !== "info" && (isLoading || (isAuthenticated && !isAccountReady))) return <WelcomeLoading error={accountError} onRetry={() => void refreshAccount().catch(() => {})} onSignOut={() => void logout()} />;
  if (segments[0] !== "info" && isAuthenticated && user?.role !== "driver" && user?.isVerified === true && user?.isActive === false) return <WelcomeLoading error="Your account is inactive. Contact MOTA support." onRetry={() => void refreshAccount().catch(() => {})} onSignOut={() => void logout()} />;

  return (
    <>
      <PushNotificationManager />
      <ReleaseNotice />
      <ThemedStack />
      <PrivacyConsentBanner />
    </>
  );
}

function WelcomeLoading({ error, onRetry, onSignOut }: { error?: string; onRetry?: () => void; onSignOut?: () => void }) {
  const { colors, isDark } = useTheme();
  return <View accessibilityLabel="Loading MOTA" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
    <Image source={isDark ? require("@/assets/images/official-mota-black-logo-removebg-preview.png") : require("@/assets/images/official-mota-white-logo-removebg-preview.png")} resizeMode="contain" style={{ width: 220, height: 100 }} />
    <Text accessibilityRole="text" style={{ color: colors.textSecondary, marginTop: 16 }}>{error || "Checking your account…"}</Text>
    {error ? <><Text accessibilityRole="button" onPress={onRetry} style={{ color: colors.primary, padding: 20 }}>Retry account check</Text><Text accessibilityRole="button" onPress={onSignOut} style={{ color: colors.textSecondary, padding: 20 }}>Sign out</Text></> : null}
  </View>;
}

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      <Stack.Screen name="(passenger)" options={{ headerShown: false }} />
      <Stack.Screen name="(agent)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="(guest)" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{ presentation: "modal", title: "Notifications" }}
      />
      <Stack.Screen
        name="card"
        options={{ presentation: "modal", title: "MOTA Membership Card" }}
      />
      <Stack.Screen
        name="send-money"
        options={{ presentation: "modal", title: "Send Money" }}
      />
      <Stack.Screen
        name="active-ride"
        options={{ presentation: "fullScreenModal", headerShown: false }}
      />
      <Stack.Screen
        name="log-ride"
        options={{ presentation: "modal", title: "Log Ride" }}
      />
      <Stack.Screen
        name="loans"
        options={{ presentation: "modal", title: "Loans" }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{ presentation: "modal", title: "Leaderboard" }}
      />
      <Stack.Screen
        name="profile/personal-info"
        options={{ title: "Personal Information" }}
      />
      <Stack.Screen
        name="profile/vehicle-info"
        options={{ title: "Vehicle Information" }}
      />
      <Stack.Screen
        name="profile/documents"
        options={{ title: "Documents & Permits" }}
      />
      <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <I18nProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                    <GlobalAlert />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </I18nProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
