import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useWideLayout } from "@/hooks/useWideLayout";
import { AuthBrandPanel } from "@/components/web/AuthBrandPanel";

export default function AuthLayout() {
  const { colors } = useTheme();
  const { wide, width } = useWideLayout();
  const insets = useSafeAreaInsets();
  const screens = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="verification-progress" />
      <Stack.Screen name="driver-kyc" />
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="create-profile" />
      <Stack.Screen name="payment-registration" />
    </Stack>
  );
  // Every sign-in and setup screen gets the language button. The bar takes the top inset, so screens must not add it again.
  const stack = (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 4, alignItems: "flex-end" }}><LanguagePicker /></View>
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}><View style={{ flex: 1 }}>{screens}</View></SafeAreaInsetsContext.Provider>
    </View>
  );
  if (!wide) return stack;
  // Wide browsers: brand panel on the left, the form in a comfortable column on the right.
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.background }}>
      <AuthBrandPanel />
      <View style={{ width: Math.min(560, Math.max(440, width * 0.42)), borderLeftWidth: 1, borderLeftColor: colors.border }}>{stack}</View>
    </View>
  );
}
