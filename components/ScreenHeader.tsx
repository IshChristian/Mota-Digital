import { ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export function ScreenHeader({ title, subtitle, action, close = false }: { title: string; subtitle?: string; action?: ReactNode; close?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  // Opened from a link or after a refresh there is no history to go back to: go home instead.
  const goBack = () => router.canGoBack() ? router.back() : router.replace((user?.role === "driver" ? "/(driver)" : "/(passenger)") as any);
  const top = Platform.OS === "web" ? Math.max(insets.top, 20) : insets.top + 8;
  return <View style={{ paddingTop: top, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12, minHeight: top + 60 }}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 14, backgroundColor: colors.backgroundCard, borderColor: colors.border, borderWidth: 1, alignItems: "center", justifyContent: "center" }}>
      <Feather name={close ? "x" : "arrow-left"} size={21} color={colors.textPrimary} />
    </TouchableOpacity>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 21, lineHeight: 27 }}>{title}</Text>
      {subtitle ? <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
    {action || null}
  </View>;
}
