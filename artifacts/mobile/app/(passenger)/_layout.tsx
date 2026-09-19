import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/context/ThemeContext";

export default function PassengerLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="rides" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="profile/personal-info" />
      <Stack.Screen name="profile/safety" />
      <Stack.Screen name="profile/payment-methods" />
      <Stack.Screen name="profile/support" />
      <Stack.Screen name="profile/about" />
      <Stack.Screen name="ride-details/[id]" />
    </Stack>
  );
}
