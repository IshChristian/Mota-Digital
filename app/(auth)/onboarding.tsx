import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";

const slides = [
  {
    icon: "map-pin",
    title: "onboard.t1",
    message: "onboard.m1",
  },
  {
    icon: "navigation",
    title: "onboard.t2",
    message: "onboard.m2",
  },
  {
    icon: "shield",
    title: "onboard.t3",
    message: "onboard.m3",
  },
] as const;
export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const t = useT();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const slide = slides[index];
  const logo = isDark
    ? require("@/assets/images/official-mota-black-logo-removebg-preview.png")
    : require("@/assets/images/official-mota-white-logo-removebg-preview.png");
  return (
    <View style={[s.page, { backgroundColor: colors.background }]}>
      <Image source={logo} style={s.logo} resizeMode="contain" />
      <View style={[s.icon, { backgroundColor: `${colors.primary}18` }]}>
        <Feather name={slide.icon} size={46} color={colors.primary} />
      </View>
      <Text style={[s.title, { color: colors.textPrimary }]}>
        {t(slide.title)}
      </Text>
      <Text style={[s.message, { color: colors.textSecondary }]}>
        {t(slide.message)}
      </Text>
      <View style={s.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              {
                backgroundColor: i === index ? colors.primary : colors.border,
                width: i === index ? 26 : 8,
              },
            ]}
          />
        ))}
      </View>
      <TouchableOpacity
        style={[s.button, { backgroundColor: colors.primary }]}
        onPress={() =>
          index < slides.length - 1
            ? setIndex(index + 1)
            : router.replace("/(auth)/welcome")
        }
      >
        <Text style={s.buttonText}>
          {index < slides.length - 1 ? t("onboard.next") : t("onboard.start")}
        </Text>
        <Feather name="arrow-right" size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace("/(auth)/welcome")}>
        <Text style={[s.skip, { color: colors.textSecondary }]}>
          {t("onboard.skip")}
        </Text>
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
  logo: { width: 160, height: 58, marginBottom: 44 },
  icon: {
    width: 108,
    height: 108,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    textAlign: "center",
    marginTop: 30,
  },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 380,
  },
  dots: { flexDirection: "row", gap: 8, marginVertical: 34 },
  dot: { height: 8, borderRadius: 4 },
  button: {
    width: "100%",
    maxWidth: 400,
    minHeight: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: { color: "#fff", fontFamily: "Inter_700Bold" },
  skip: { fontFamily: "Inter_600SemiBold", marginTop: 18 },
});
