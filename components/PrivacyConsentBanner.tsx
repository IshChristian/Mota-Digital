import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

const KEY = "mota_privacy_preferences_v1";
export function PrivacyConsentBanner() {
  const router = useRouter();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web")
      AsyncStorage.getItem(KEY).then((value) => setVisible(!value));
  }, []);
  if (!visible) return null;
  const save = async (value: "essential" | "all") => {
    await AsyncStorage.setItem(KEY, value);
    setVisible(false);
  };
  return (
    <View
      style={[
        s.banner,
        { backgroundColor: colors.backgroundCard, borderColor: colors.border },
      ]}
    >
      <Text style={[s.title, { color: colors.textPrimary }]}>
        Privacy preferences
      </Text>
      <Text style={[s.text, { color: colors.textSecondary }]}>
        MOTA uses essential storage for sign-in and security. Optional analytics
        are enabled only when accepted.
      </Text>
      <View style={s.actions}>
        <TouchableOpacity
          onPress={() => void save("essential")}
          style={[s.secondary, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.textPrimary }}>Essential only</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void save("all")}
          style={[s.primary, { backgroundColor: colors.primary }]}
        >
          <Text style={s.primaryText}>Accept all</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => router.push("/info/privacy" as any)}>
        <Text style={[s.link, { color: colors.primary }]}>
          Read privacy policy
        </Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    zIndex: 9999,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 16 },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  actions: { flexDirection: "row", gap: 9, marginTop: 13 },
  secondary: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold" },
  link: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "center",
    marginTop: 11,
  },
});
