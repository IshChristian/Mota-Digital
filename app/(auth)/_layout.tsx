import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { View } from "react-native";
import { useWideLayout } from "@/hooks/useWideLayout";
import { AuthBrandPanel } from "@/components/web/AuthBrandPanel";

export default function AuthLayout() {
  const { colors } = useTheme();
  const { wide, width } = useWideLayout();
  const stack = (
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
  if (!wide) return stack;
  // Wide browsers: brand panel on the left, the form in a comfortable column on the right.
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.background }}>
      <AuthBrandPanel />
      <View style={{ width: Math.min(560, Math.max(440, width * 0.42)), borderLeftWidth: 1, borderLeftColor: colors.border }}>{stack}</View>
    </View>
  );
}
