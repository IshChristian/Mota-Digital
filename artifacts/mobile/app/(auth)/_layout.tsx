import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="upload-documents" />
      <Stack.Screen name="create-profile" />
      <Stack.Screen name="payment-registration" />
      <Stack.Screen name="pending-approval" />
    </Stack>
  );
}
