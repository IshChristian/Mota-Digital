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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user, hasDriverProfile } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isPassenger = user?.role?.toUpperCase() === 'CLIENT' || user?.role?.toUpperCase() === 'PASSENGER';

    // A user is fully onboarded when all verification & approval steps are done.
    // We check each gate individually rather than relying on isActive, because
    // the backend may not flip isActive immediately after approval.
    const isFullyOnboarded = isAuthenticated && user && (
      user.isActive === true || (
        user.isVerified === true &&
        (user.isEmailVerified === true || !user.email) &&
        (isPassenger || user.registrationPaid !== false) &&
        (isPassenger || user.registrationStatus === 'approved') &&
        (isPassenger || hasDriverProfile || user.kycLevel === 'full')
      )
    );

    // Individual onboarding gates — only evaluated if not fully onboarded
    const needsPhoneVerification = !isFullyOnboarded && isAuthenticated && user && user.isVerified === false;
    const needsEmailVerification = !isFullyOnboarded && isAuthenticated && user && user.isEmailVerified === false && !!user.email;
    const needsPayment = !isFullyOnboarded && isAuthenticated && user && !isPassenger && user.registrationPaid === false;
    // Skip profile gate if backend confirms a driver profile already exists (passengers don't have driver profiles)
    const needsProfile = !isFullyOnboarded && isAuthenticated && user && user.kycLevel !== 'full' && !isPassenger && !hasDriverProfile;
    const needsApproval = !isFullyOnboarded && isAuthenticated && user && !isPassenger && user.registrationStatus && user.registrationStatus !== 'approved';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/welcome" as any);
    } else if (isAuthenticated) {
      if (needsPhoneVerification) {
        if (segments[1] !== 'otp') router.replace("/(auth)/otp");
      } else if (needsEmailVerification) {
        if (segments[1] !== 'verify-email') router.replace("/(auth)/verify-email");
      } else if (needsPayment) {
        if (segments[1] !== 'payment-registration') router.replace("/(auth)/payment-registration");
      } else if (needsProfile) {
        if (segments[1] !== 'create-profile' && segments[1] !== 'upload-documents') router.replace("/(auth)/create-profile");
      } else if (needsApproval) {
        if (segments[1] !== 'pending-approval') router.replace("/(auth)/pending-approval" as any);
      } else {
        // Fully onboarded — route to the appropriate home screen
        if (inAuthGroup) {
          const role = user?.role?.toUpperCase() || 'DRIVER';
          if (role === 'ADMIN') router.replace("/(admin)" as any);
          else if (role === 'AGENT') router.replace("/(agent)" as any);
          else if (role === 'CLIENT' || role === 'PASSENGER') router.replace("/(passenger)" as any);
          else router.replace("/(driver)" as any);
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, user, hasDriverProfile]);

  if (isLoading) return null;

  return (
    <ThemedStack />
  );
}

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{
      headerShown: false,
      headerBackTitle: "Back",
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: { color: colors.textPrimary },
      contentStyle: { backgroundColor: colors.background },
    }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      <Stack.Screen name="(passenger)" options={{ headerShown: false }} />
      <Stack.Screen name="(agent)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="(guest)" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ presentation: 'modal', title: 'Notifications' }} />
      <Stack.Screen name="card" options={{ presentation: 'modal', title: 'MOTA Card' }} />
      <Stack.Screen name="send-money" options={{ presentation: 'modal', title: 'Send Money' }} />
      <Stack.Screen name="active-ride" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="log-ride" options={{ presentation: 'modal', title: 'Log Ride' }} />
      <Stack.Screen name="loans" options={{ presentation: 'modal', title: 'Loans' }} />
      <Stack.Screen name="leaderboard" options={{ presentation: 'modal', title: 'Leaderboard' }} />
      <Stack.Screen name="profile/personal-info" options={{ title: 'Personal Information' }} />
      <Stack.Screen name="profile/vehicle-info" options={{ title: 'Vehicle Information' }} />
      <Stack.Screen name="profile/documents" options={{ title: 'Documents & Permits' }} />
      <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
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
