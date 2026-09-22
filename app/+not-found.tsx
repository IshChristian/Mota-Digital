import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const logo = isDark
    ? require("@/assets/images/official-mota-white-logo-removebg-preview.png")
    : require("@/assets/images/official-mota-black-logo-removebg-preview.png");
  return (
    <View style={[s.page, { backgroundColor: colors.background }]}>
      <Image source={logo} style={s.logo} resizeMode="contain" />
      <View style={[s.icon, { backgroundColor: `${colors.primary}18` }]}>
        <Feather name="map-pin" size={38} color={colors.primary} />
      </View>
      <Text style={[s.code, { color: colors.primary }]}>404</Text>
      <Text style={[s.title, { color: colors.textPrimary }]}>
        Screen not found
      </Text>
      <Text style={[s.message, { color: colors.textSecondary }]}>
        The link may be outdated or the screen may have moved.
      </Text>
      <TouchableOpacity
        style={[s.button, { backgroundColor: colors.primary }]}
        onPress={() => router.replace("/" as any)}
      >
        <Text style={s.buttonText}>Return home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={[s.back, { color: colors.textPrimary }]}>Go back</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  logo: { width: 150, height: 54, marginBottom: 30 },
  icon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  code: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 4 },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    minHeight: 52,
    borderRadius: 17,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  buttonText: { color: "#fff", fontFamily: "Inter_700Bold" },
  back: { fontFamily: "Inter_600SemiBold", marginTop: 18 },
});
