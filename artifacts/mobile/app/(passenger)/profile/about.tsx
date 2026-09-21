import { Image, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useTheme } from "@/context/ThemeContext";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";

export default function About() {
  const { colors, isDark } = useTheme();
  const logo = isDark
    ? require("@/assets/images/official-mota-white-logo-removebg-preview.png")
    : require("@/assets/images/official-mota-black-logo-removebg-preview.png");

  return (
    <PassengerSettingsScreen title="About MOTA">
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: colors.border,
          },
        ]}
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.text, { color: colors.textPrimary }]}>
          Safe, trackable transport and digital services for passengers and
          drivers.
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Version {Constants.expoConfig?.version || "1.0.0"}
        </Text>
      </View>
    </PassengerSettingsScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 22, alignItems: "center" },
  logo: { width: 210, height: 76 },
  text: { fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 22 },
  meta: { marginTop: 20 },
});
