import { useState } from "react";
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { useWideLayout } from "@/hooks/useWideLayout";
import { ANDROID_APK_URL } from "@/constants/download";

type Audience = "any" | "client" | "driver";
type Variant = "brand" | "card" | "compact";

const HIDE_DAYS = 14;
const storageKey = (id: string) => `mota.getApp.hidden.${id}`;

function hiddenRecently(id?: string) {
  if (!id) return false;
  try {
    const at = Number(window.localStorage.getItem(storageKey(id)));
    return Number.isFinite(at) && at > 0 && Date.now() - at < HIDE_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function remember(id: string) {
  try { window.localStorage.setItem(storageKey(id), String(Date.now())); } catch { /* storage blocked: hide for this visit only */ }
}

function openApk() {
  if (Platform.OS === "web" && typeof window !== "undefined") window.open(ANDROID_APK_URL, "_blank", "noopener");
  else void Linking.openURL(ANDROID_APK_URL);
}

/**
 * "Get the Android app" prompt, shown only on wide browsers (desktop/tablet), where people
 * can scan the QR code with their phone. `brand` sits on the red auth panel, `card` is a full
 * card with perks, `compact` fits narrow side panels. Pass `dismissId` to let people hide it for two weeks.
 */
export function GetAppCard({ audience = "any", variant = "card", dismissId, style }: { audience?: Audience; variant?: Variant; dismissId?: string; style?: StyleProp<ViewStyle> }) {
  const { wide } = useWideLayout();
  const { colors } = useTheme();
  const t = useT();
  const [hidden, setHidden] = useState(() => hiddenRecently(dismissId));
  if (!wide || hidden) return null;

  const onBrand = variant === "brand";
  const fg = onBrand ? "#fff" : colors.textPrimary;
  const muted = onBrand ? "rgba(255,255,255,0.78)" : colors.textSecondary;
  const qrSize = variant === "compact" ? 76 : 96;
  const perks: Array<{ icon: React.ComponentProps<typeof Feather>["name"]; label: string }> = [
    { icon: "bell", label: t("web.get_app_perk_alerts") },
    { icon: "navigation", label: t("web.get_app_perk_gps") },
    { icon: "wifi", label: t("web.get_app_perk_data") },
  ];

  return (
    <View
      style={[
        s.wrap,
        onBrand
          ? { backgroundColor: "rgba(11,15,23,0.42)", borderColor: "rgba(255,255,255,0.16)" }
          : { backgroundColor: colors.backgroundCard, borderColor: `${colors.primary}40` },
        variant === "compact" && s.wrapCompact,
        style,
      ]}
    >
      {dismissId ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("web.get_app_dismiss")} hitSlop={8} style={s.close}
          onPress={() => { remember(dismissId); setHidden(true); }}>
          <Feather name="x" size={16} color={muted} />
        </TouchableOpacity>
      ) : null}
      <View style={s.row}>
        <View style={s.qr} accessibilityLabel={t("web.get_app_scan")}>
          <QRCode value={ANDROID_APK_URL} size={qrSize} color="#0B0F17" backgroundColor="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={s.kickerRow}>
            <Feather name="smartphone" size={13} color={onBrand ? "#fff" : colors.primary} />
            <Text style={[s.kicker, { color: onBrand ? "#fff" : colors.primary }]}>{t("web.get_app_kicker").toUpperCase()}</Text>
          </View>
          <Text style={[s.title, { color: fg }, variant === "compact" && { fontSize: 15 }]}>{t(`web.get_app_title_${audience}`)}</Text>
          {variant !== "compact" ? <Text style={[s.body, { color: muted }]}>{t(`web.get_app_body_${audience}`)}</Text> : null}
          <Text style={[s.scan, { color: muted }]}>{t("web.get_app_scan")}</Text>
        </View>
      </View>
      {variant === "card" ? (
        <View style={s.perks}>
          {perks.map((p) => (
            <View key={p.label} style={[s.perk, { backgroundColor: colors.backgroundElevated }]}>
              <Feather name={p.icon} size={13} color={colors.primary} />
              <Text style={[s.perkText, { color: colors.textPrimary }]}>{p.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={s.actions}>
        <TouchableOpacity accessibilityRole="link" onPress={openApk}
          style={[s.button, { backgroundColor: onBrand ? "#fff" : colors.primary }]}>
          <Feather name="download" size={16} color={onBrand ? "#9D1C27" : "#fff"} />
          <Text style={[s.buttonText, { color: onBrand ? "#9D1C27" : "#fff" }]}>{t("web.get_app_download")}</Text>
        </TouchableOpacity>
        <Text style={[s.note, { color: muted }]}>{t("web.get_app_note")}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  wrapCompact: { padding: 14, gap: 12 },
  close: { position: "absolute", top: 10, right: 10, zIndex: 1, padding: 4 },
  row: { flexDirection: "row", gap: 14, alignItems: "center", paddingRight: 18 },
  qr: { padding: 6, borderRadius: 10, backgroundColor: "#fff" },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 17, lineHeight: 22 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  scan: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  perks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  perk: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  perkText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  button: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  note: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
