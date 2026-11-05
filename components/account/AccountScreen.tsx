import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import { LANGUAGES, useI18n, useT, type Language } from "@/context/I18nContext";
import { googleMapsAvailable, useMapPreference } from "@/context/MapPreferenceContext";
import { Alert } from "@/components/GlobalAlert";
import { NotificationBell } from "@/components/NotificationBell";
import { driverApi, getApiErrorMessage, usersApi } from "@/services/api";
import { useWideLayout } from "@/hooks/useWideLayout";
import { GetAppCard } from "@/components/web/GetAppCard";

type Role = "client" | "driver";
type Icon = React.ComponentProps<typeof Feather>["name"];
type Row = { icon: Icon; label: string; detail?: string; path?: string; onPress?: () => void; danger?: boolean };
type Section = { title: string; rows: Row[] };

const DISTANCES = [1, 2, 3, 5, 8, 10, 15];

/**
 * One account page for passengers and drivers. Sections are grouped by
 * purpose; preferences (language, theme, map, request distance) are edited
 * inline so the most common changes take one tap.
 */
export function AccountScreen({ role }: { role: Role }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { language, setLanguage } = useI18n();
  const { colors, isDark, setMode } = useTheme();
  const { mapProvider, setMapProvider } = useMapPreference();
  const { user, logout, updateUser } = useAuth();
  const s = styles(colors);
  const { wide } = useWideLayout();
  const photo = user?.avatarUrl || user?.profileImage;
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sheet, setSheet] = useState<null | "language" | "distance">(null);

  // Driver: how far a pickup may be before MOTA offers the ride.
  const [radius, setRadius] = useState<{ value: number | null; system: number } | null>(null);
  const [radiusBusy, setRadiusBusy] = useState(false);
  useEffect(() => {
    if (role !== "driver") return;
    driverApi.getPreferences().then((r) => setRadius({ value: r.data.data.requestRadiusKm, system: r.data.data.systemRadiusKm })).catch(() => setRadius({ value: null, system: 5 }));
  }, [role]);

  const chooseLanguage = async (code: Language) => {
    setSheet(null);
    await setLanguage(code);
    // Saved on the account too, so notifications can use it.
    void usersApi.updateMe({ preferredLanguage: code }).then(() => updateUser({ preferredLanguage: code })).catch(() => {});
  };

  const chooseRadius = async (value: number | null) => {
    setRadiusBusy(true);
    try {
      await driverApi.updatePreferences({ requestRadiusKm: value });
      setRadius((r) => ({ value, system: r?.system ?? 5 }));
      setSheet(null);
      Alert.alert(t("account.request_distance"), t("account.request_distance_saved", { km: String(value ?? radius?.system ?? 5) }));
    } catch (error) {
      Alert.alert(t("account.request_distance"), getApiErrorMessage(error));
    } finally {
      setRadiusBusy(false);
    }
  };

  const changePhoto = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") return Alert.alert(t("account.photo_failed"), t("account.photo_permission"));
      const result = await ImagePicker.launchImageLibraryAsync({ base64: true, mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const updated = await usersApi.uploadAvatar(asset.uri, asset.base64, asset.fileName || undefined, asset.mimeType || undefined);
      await updateUser({ avatarUrl: updated.avatarUrl });
      Alert.alert(t("account.photo_updated"), t("account.photo_updated_body"));
    } catch (error) {
      Alert.alert(t("account.photo_failed"), getApiErrorMessage(error));
    } finally {
      setPhotoBusy(false);
    }
  };

  const confirmLogout = () => Alert.alert(t("account.logout"), t("account.logout_confirm"), [
    { text: t("cancel"), style: "cancel" },
    { text: t("account.logout"), style: "destructive", onPress: () => void logout() },
  ]);

  const languageLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
  const radiusLabel = radius ? (radius.value ? t("account.km", { km: String(radius.value) }) : t("account.request_distance_default", { km: String(radius.system) })) : "…";

  const roleSections: Section[] =
    role === "driver" ? [
      { title: t("account.section_driving"), rows: [
        { icon: "radio", label: t("account.request_distance"), detail: radiusLabel, onPress: () => setSheet("distance") },
        { icon: "bar-chart-2", label: t("account.performance"), path: "/driver-performance" },
        { icon: "truck", label: t("account.vehicle"), path: "/driver-profile/vehicle-info" },
        { icon: "file-text", label: t("account.documents"), path: "/driver-profile/documents" },
        { icon: "shield", label: t("account.driver_kyc"), path: "/(driver)/kyc" },
      ] },
      { title: t("account.section_money"), rows: [
        { icon: "trending-up", label: t("account.finance"), path: "/(driver)/finance" },
        { icon: "droplet", label: t("account.fuel"), path: "/fuel-vouchers" },
        { icon: "gift", label: t("account.invite"), path: "/referrals" },
      ] },
    ] : [
      { title: t("account.section_money"), rows: [
        { icon: "credit-card", label: t("account.wallet"), path: "/(passenger)/wallet" },
        { icon: "dollar-sign", label: t("account.payment_methods"), path: "/(passenger)/profile/payment-methods" },
        { icon: "gift", label: t("account.invite"), path: "/referrals" },
      ] },
    ];

  const sections: Section[] = [
    { title: t("account.section_preferences"), rows: [
      { icon: "globe", label: t("account.language"), detail: languageLabel, onPress: () => setSheet("language") },
    ] },
    { title: t("account.section_account"), rows: [
      { icon: "user", label: t("account.personal_info"), path: role === "client" ? "/(passenger)/profile/personal-info" : "/driver-profile/personal-info" },
      ...(role === "client" ? [
        { icon: "check-circle" as Icon, label: t("account.verification"), path: "/(passenger)/profile/kyc" },
        { icon: "star" as Icon, label: t("account.saved_places"), path: "/(passenger)/profile/places" },
      ] : []),
      { icon: "bell", label: t("account.notifications"), path: "/notification-settings" },
    ] },
    ...roleSections,
    { title: t("account.section_safety"), rows: [
      { icon: "shield" as Icon, label: t("account.safety_contacts"), path: "/safety-contacts" },
      ...(role === "client" ? [{ icon: "alert-circle" as Icon, label: t("account.disputes"), path: "/ride-disputes" }] : []),
      { icon: "smartphone", label: t("account.sessions"), path: "/sessions" },
      { icon: "lock", label: t("account.security"), path: "/security" },
    ] },
    { title: t("account.section_support"), rows: [
      { icon: "help-circle", label: t("account.help"), path: "/info/help" },
      { icon: "phone", label: t("account.contact"), path: "/info/contact" },
      { icon: "search", label: t("account.search"), path: "/search" },
    ] },
    { title: t("account.section_legal"), rows: [
      { icon: "info", label: t("account.about"), path: "/info/about" },
      { icon: "book-open", label: t("account.legal"), path: "/info/legal" },
      { icon: "shield", label: t("account.privacy"), path: "/info/privacy" },
      { icon: "file-text", label: role === "driver" ? t("account.driver_terms") : t("account.terms"), path: role === "driver" ? "/info/driver-terms" : "/info/passenger-terms" },
    ] },
  ];

  const needsVerification = role === "client" && (user?.kycLevel !== "full" || (!!user?.email && !user?.isEmailVerified));

  const profileCard = (
    <View style={[s.card, s.profile, wide && s.profileWide]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("account.tap_photo")} disabled={photoBusy} onPress={() => void changePhoto()} style={[s.avatar, wide && s.avatarWide]}>
        {photo ? <Image source={{ uri: photo }} style={wide ? s.avatarImgWide : s.avatarImg} /> : <Text style={s.initials}>{`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`}</Text>}
        <View style={s.camera}>{photoBusy ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="camera" size={12} color="#fff" />}</View>
      </TouchableOpacity>
      <View style={wide ? { alignItems: "center" } : { flex: 1 }}>
        <Text style={[s.name, wide && { textAlign: "center" }]}>{user?.firstName} {user?.lastName}</Text>
        <Text style={[s.subtle, wide && { textAlign: "center" }]}>{user?.phone || user?.email}</Text>
        <View style={[s.badge, wide && { alignSelf: "center" }]}><Text style={s.badgeText}>{t(`account.role_${role}`)}</Text></View>
      </View>
    </View>
  );
  const verification = needsVerification ? (
    <View style={[s.card, { padding: 16, gap: 8, borderColor: `${colors.primary}55` }]}>
      <Text style={s.rowLabel}>{t("account.verify_title")}</Text>
      <Text style={s.subtle}>{t("account.verify_body")}</Text>
      {user?.kycLevel !== "full" ? <RowView s={s} colors={colors} row={{ icon: "check-circle", label: t("account.verify_id"), detail: t("account.verify_id_detail"), path: "/(passenger)/profile/kyc" }} onPress={() => router.push("/(passenger)/profile/kyc" as any)} /> : null}
      {!!user?.email && !user?.isEmailVerified ? <RowView s={s} colors={colors} row={{ icon: "mail", label: t("account.verify_email"), detail: user.email }} onPress={() => router.push("/(auth)/verify-email" as any)} /> : null}
    </View>
  ) : null;
  /* Appearance and map are segmented controls: one tap, no extra screen. */
  const appearance = (
    <View style={[s.card, { padding: 14, gap: 14 }]}>
      <View>
        <Text style={s.rowLabel}>{t("account.theme")}</Text>
        <Segmented colors={colors} value={isDark ? "dark" : "light"} options={[{ value: "light", label: t("account.theme_light"), icon: "sun" }, { value: "dark", label: t("account.theme_dark"), icon: "moon" }]} onChange={(v) => setMode(v as "light" | "dark")} />
      </View>
      <View>
        <Text style={s.rowLabel}>{t("account.map")}</Text>
        <Segmented colors={colors} value={mapProvider} options={[
          { value: "google", label: t("account.map_google"), icon: "map", disabled: !googleMapsAvailable },
          { value: "osm", label: t("account.map_osm"), icon: "map-pin" },
        ]} onChange={(v) => setMapProvider(v as "google" | "osm")} />
        <Text style={[s.subtle, { marginTop: 6, fontSize: 12 }]}>{t("account.map_detail")}</Text>
      </View>
    </View>
  );
  const sectionCards = sections.map((section) => (
    <View key={section.title} style={[{ gap: 6 }, wide && s.gridItem]}>
      <Text style={s.sectionTitle}>{section.title}</Text>
      <View style={s.card}>
        {section.rows.map((row, i) => (
          <View key={row.label}>
            {i > 0 ? <View style={s.divider} /> : null}
            <RowView s={s} colors={colors} row={row} onPress={row.onPress ?? (() => router.push(row.path as any))} />
          </View>
        ))}
      </View>
    </View>
  ));
  const logoutCard = (
    <View style={s.card}>
      <RowView s={s} colors={colors} row={{ icon: "log-out", label: t("account.logout"), detail: t("account.logout_detail"), danger: true }} onPress={confirmLogout} />
    </View>
  );
  const header = (
    <View style={s.headerRow}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={s.title}>{t("account.title")}</Text>
        <Text style={s.subtle}>{t("account.subtitle")}</Text>
      </View>
      <NotificationBell />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={wide ? s.wideContent : { paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false}>
        {header}
        {wide ? (
          <View style={s.wideRow}>
            <View style={s.wideAside}>{profileCard}{verification}<GetAppCard variant="compact" audience={role === "driver" ? "driver" : "client"} dismissId={`account-${role}`} />{appearance}{logoutCard}</View>
            <View style={s.wideMain}>{sectionCards}</View>
          </View>
        ) : (
          <>{profileCard}{verification}{appearance}{sectionCards}{logoutCard}</>
        )}
      </ScrollView>

      <Modal transparent visible={sheet !== null} animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={[s.backdrop, wide && s.backdropWide]} onPress={() => setSheet(null)} accessibilityLabel={t("cancel")}>
          <Pressable style={[s.sheet, wide && s.dialog]} onPress={() => {}}>
            {sheet === "language" ? (
              <>
                <Text style={s.sheetTitle}>{t("account.language")}</Text>
                {LANGUAGES.map((l) => (
                  <TouchableOpacity key={l.code} accessibilityRole="radio" accessibilityState={{ selected: language === l.code }} onPress={() => void chooseLanguage(l.code)} style={s.option}>
                    <Text style={s.optionText}>{l.label}</Text>
                    {language === l.code ? <Feather name="check" size={20} color={colors.primary} /> : null}
                  </TouchableOpacity>
                ))}
              </>
            ) : sheet === "distance" ? (
              <>
                <Text style={s.sheetTitle}>{t("account.request_distance")}</Text>
                <Text style={s.subtle}>{t("account.request_distance_detail")}</Text>
                <View style={s.chips}>
                  <Chip colors={colors} active={!radius?.value} label={t("account.request_distance_default", { km: String(radius?.system ?? 5) })} onPress={() => void chooseRadius(null)} disabled={radiusBusy} />
                  {DISTANCES.map((km) => <Chip key={km} colors={colors} active={radius?.value === km} label={t("account.km", { km: String(km) })} onPress={() => void chooseRadius(km)} disabled={radiusBusy} />)}
                </View>
                {radiusBusy ? <ActivityIndicator color={colors.primary} /> : null}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function RowView({ row, onPress, s, colors }: { row: Row; onPress: () => void; s: ReturnType<typeof styles>; colors: ThemeColors }) {
  const tint = row.danger ? colors.error : colors.primary;
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={row.detail ? `${row.label}, ${row.detail}` : row.label} onPress={onPress} style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: `${tint}18` }]}><Feather name={row.icon} size={18} color={tint} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, row.danger && { color: colors.error }]}>{row.label}</Text>
        {row.detail ? <Text style={s.subtle} numberOfLines={1}>{row.detail}</Text> : null}
      </View>
      {!row.danger ? <Feather name="chevron-right" size={18} color={colors.textTertiary} /> : null}
    </TouchableOpacity>
  );
}

function Segmented({ value, options, onChange, colors }: { value: string; options: Array<{ value: string; label: string; icon: Icon; disabled?: boolean }>; onChange: (v: string) => void; colors: ThemeColors }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity key={o.value} accessibilityRole="radio" accessibilityState={{ selected: active, disabled: o.disabled }} disabled={o.disabled} onPress={() => onChange(o.value)}
            style={{ flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}18` : colors.backgroundElevated, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, opacity: o.disabled ? 0.45 : 1 }}>
            <Feather name={o.icon} size={15} color={active ? colors.primary : colors.textSecondary} />
            <Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Chip({ label, active, onPress, disabled, colors }: { label: string; active: boolean; onPress: () => void; disabled?: boolean; colors: ThemeColors }) {
  return (
    <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: active }} disabled={disabled} onPress={onPress}
      style={{ paddingHorizontal: 14, minHeight: 44, borderRadius: 22, borderWidth: 1, justifyContent: "center", borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}18` : colors.backgroundElevated }}>
      <Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: c.textPrimary },
  subtle: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.textSecondary },
  card: { backgroundColor: c.backgroundCard, borderRadius: 18, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  profile: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 68, height: 68, borderRadius: 34 },
  initials: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  camera: { position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: c.secondary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.backgroundCard },
  name: { fontSize: 19, fontFamily: "Inter_700Bold", color: c.textPrimary },
  badge: { alignSelf: "flex-start", marginTop: 6, backgroundColor: `${c.primary}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: c.primary, fontSize: 12, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", color: c.textSecondary, textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, minHeight: 58 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textPrimary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 62 },
  backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 12 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.textPrimary },
  option: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  optionText: { fontSize: 16, color: c.textPrimary, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  // Wide browsers: identity and preferences on the left, settings as a grid on the right.
  wideContent: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 48, gap: 24 },
  wideRow: { flexDirection: "row", gap: 24, alignItems: "flex-start" },
  wideAside: { width: 320, gap: 16 },
  wideMain: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 20 },
  gridItem: { flexGrow: 1, flexBasis: 280 },
  profileWide: { flexDirection: "column", paddingVertical: 24, gap: 12 },
  avatarWide: { width: 92, height: 92, borderRadius: 46 },
  avatarImgWide: { width: 92, height: 92, borderRadius: 46 },
  backdropWide: { justifyContent: "center", alignItems: "center" },
  dialog: { width: 440, borderRadius: 24, paddingBottom: 24 },
});
