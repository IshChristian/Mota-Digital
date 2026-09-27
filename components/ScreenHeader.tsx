import { ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

export function ScreenHeader({ title, action, close = false }: { title: string; action?: ReactNode; close?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return <View style={{ paddingTop: insets.top + 8, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12, minHeight: insets.top + 68 }}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.backgroundCard, borderColor: colors.border, borderWidth: 1, alignItems: "center", justifyContent: "center" }}>
      <Feather name={close ? "x" : "arrow-left"} size={21} color={colors.textPrimary} />
    </TouchableOpacity>
    <Text numberOfLines={2} style={{ flex: 1, color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 21, lineHeight: 27 }}>{title}</Text>
    {action || null}
  </View>;
}
