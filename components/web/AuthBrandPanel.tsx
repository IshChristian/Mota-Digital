import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useT } from "@/context/I18nContext";

type Icon = React.ComponentProps<typeof Feather>["name"];

/** Left half of the sign-in screens on wide browsers: who MOTA is for, in brand colours. */
export function AuthBrandPanel() {
  const t = useT();
  const points: Array<{ icon: Icon; title: string; body: string }> = [
    { icon: "navigation", title: t("web.auth_point_ride"), body: t("web.auth_point_ride_body") },
    { icon: "map", title: t("web.auth_point_live"), body: t("web.auth_point_live_body") },
    { icon: "trending-up", title: t("web.auth_point_earn"), body: t("web.auth_point_earn_body") },
  ];
  return (
    <LinearGradient colors={["#E63946", "#9D1C27", "#0B0F17"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panel}>
      <View pointerEvents="none" style={[styles.ring, { width: 520, height: 520, top: -160, right: -180 }]} />
      <View pointerEvents="none" style={[styles.ring, { width: 360, height: 360, bottom: -120, left: -120 }]} />
      <Image source={require("@/assets/images/official-mota-black-logo-removebg-preview.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="MOTA" />
      <View style={styles.body}>
        <Text style={styles.kicker}>MOVE. EARN. GROW.</Text>
        <Text accessibilityRole="header" style={styles.headline}>{t("web.auth_headline")}</Text>
        <Text style={styles.sub}>{t("web.auth_sub")}</Text>
        <View style={styles.points}>
          {points.map((p) => (
            <View key={p.title} style={styles.point}>
              <View style={styles.pointIcon}><Feather name={p.icon} size={18} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointTitle}>{p.title}</Text>
                <Text style={styles.pointBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.footer}>© {new Date().getFullYear()} MOTA · Kigali, Rwanda</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, padding: 56, justifyContent: "space-between", overflow: "hidden" },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.03)" },
  logo: { width: 230, height: 70, marginLeft: -24 },
  body: { maxWidth: 520, gap: 18 },
  kicker: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 2 },
  headline: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 40, lineHeight: 48 },
  sub: { color: "rgba(255,255,255,0.82)", fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 24 },
  points: { gap: 18, marginTop: 14 },
  point: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  pointIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  pointTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  pointBody: { color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 3 },
  footer: { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_500Medium", fontSize: 12 },
});
