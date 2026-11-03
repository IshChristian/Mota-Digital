import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { pageFrame, useWideLayout } from "@/hooks/useWideLayout";

export default function PassengerLayout() {
  const { colors } = useTheme();
  const { wide } = useWideLayout();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: [{ backgroundColor: colors.background }, pageFrame(wide)],
      }}
    >
      {/* The map home uses the whole screen with its own side panel on wide browsers. */}
      <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: colors.background } }} />
      <Stack.Screen name="rides" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="profile" options={{ contentStyle: [{ backgroundColor: colors.background }, pageFrame(wide, 1120)] }} />
      <Stack.Screen name="profile/personal-info" />
      <Stack.Screen name="profile/safety" />
      <Stack.Screen name="profile/payment-methods" />
      <Stack.Screen name="profile/support" />
      <Stack.Screen name="ride-details/[id]" />
    </Stack>
  );
}
