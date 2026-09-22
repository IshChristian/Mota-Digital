import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

const states = {
  success: {
    icon: "check-circle",
    title: "Action completed",
    message: "Your request was completed successfully.",
    tone: "#10B981",
  },
  failure: {
    icon: "x-circle",
    title: "Action failed",
    message:
      "We could not complete that action. Check the details and try again.",
    tone: "#EF4444",
  },
  forbidden: {
    icon: "shield",
    title: "Access restricted",
    message: "Your account does not have permission to open this screen.",
    tone: "#F59E0B",
  },
  "server-error": {
    icon: "server",
    title: "Service unavailable",
    message: "MOTA could not reach the service. Try again in a moment.",
    tone: "#EF4444",
  },
  maintenance: {
    icon: "tool",
    title: "Maintenance in progress",
    message:
      "MOTA is temporarily unavailable while essential updates are installed.",
    tone: "#F59E0B",
  },
  offline: {
    icon: "wifi-off",
    title: "No internet connection",
    message:
      "Reconnect to the internet, then retry to refresh live information.",
    tone: "#6B7280",
  },
} as const;

export default function SystemStateScreen() {
  const { type, title, message, returnTo } = useLocalSearchParams<{
    type?: keyof typeof states;
    title?: string;
    message?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const state = states[type || "failure"] || states.failure;
  const logo = isDark
    ? require("@/assets/images/official-mota-white-logo-removebg-preview.png")
    : require("@/assets/images/official-mota-black-logo-removebg-preview.png");

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <View style={[styles.icon, { backgroundColor: `${state.tone}18` }]}>
        <Feather name={state.icon as any} size={42} color={state.tone} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title || state.title}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message || state.message}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.primary }]}
          onPress={() =>
            returnTo ? router.replace(returnTo as any) : router.back()
          }
        >
          <Feather name="refresh-cw" size={18} color="#fff" />
          <Text style={styles.primaryText}>
            {type === "success" ? "Continue" : "Try again"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondary, { borderColor: colors.border }]}
          onPress={() => router.replace("/" as any)}
        >
          <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
            Go to home
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  logo: { width: 160, height: 56, marginBottom: 34 },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 27,
    textAlign: "center",
    marginTop: 24,
  },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 420,
  },
  actions: { width: "100%", gap: 12, marginTop: 34, maxWidth: 420 },
  primary: {
    minHeight: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  secondary: {
    minHeight: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
