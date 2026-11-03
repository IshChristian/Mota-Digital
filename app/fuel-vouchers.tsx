import { safeBack } from "@/utils/navigation";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import * as Location from "expo-location";
import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { fuelVoucherApi, getApiErrorMessage } from "@/services/api";
import { Alert } from "@/components/GlobalAlert";
import { useWideLayout } from "@/hooks/useWideLayout";

type Voucher = { id: string; code: string; type: "qr" | "momo"; source: "request" | "reward"; amount: number; status: string; note?: string; qrCode?: string; issuedAt: string; expiresAt?: string; redeemedAt?: string };
type Daily = { eligible: boolean; reason?: string; tier?: string; minTier: string; amount: number; momoEnabled: boolean; qrUsed: number; momoUsed: number; qrLimit: number; momoLimit: number; resetsAt: string };
type Station = { id: string; name: string; address: string; acceptsQr: boolean; distanceKm?: number | null };

const money = (n: number) => `${Math.round(n).toLocaleString()} RWF`;
const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
const newKey = (type: string) => `fuel_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export default function FuelVouchersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const client = useQueryClient();
  const s = styles(colors);
  const { wide } = useWideLayout();
  const account = user?.id || user?._id;
  const prefix = ["fuel", account];
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<null | "qr" | "momo">(null);
  const [selected, setSelected] = useState<Voucher | null>(null);
  // One key per pending request: a retry after a timeout replays instead of creating a second voucher.
  const keys = useRef<Partial<Record<"qr" | "momo", string>>>({});
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    Location.getLastKnownPositionAsync().then((p) => p && setHere({ lat: p.coords.latitude, lng: p.coords.longitude })).catch(() => {});
  }, []);

  const daily = useQuery({ queryKey: [...prefix, "daily"], enabled: !!account, queryFn: async () => (await fuelVoucherApi.getDailyStatus()).data.data as Daily });
  const history = useQuery({ queryKey: [...prefix, "history", page], enabled: !!account, queryFn: async () => (await fuelVoucherApi.getHistory(page, 20)).data.data as { vouchers: Voucher[]; total: number } });
  const savings = useQuery({ queryKey: [...prefix, "savings"], enabled: !!account, queryFn: async () => (await fuelVoucherApi.getWeeklySavings()).data.data as { weekTotal: number } });
  const stations = useQuery({
    queryKey: [...prefix, "stations", here?.lat.toFixed(2), here?.lng.toFixed(2)],
    enabled: !!account,
    queryFn: async () => (here ? (await fuelVoucherApi.getNearbyStations(here.lat, here.lng)).data.data : (await fuelVoucherApi.getStations()).data.data) as Station[],
  });
  const refresh = () => client.invalidateQueries({ queryKey: prefix });

  const request = async (type: "qr" | "momo") => {
    if (busy) return;
    setBusy(type);
    keys.current[type] ||= newKey(type);
    try {
      const voucher = (await (type === "qr" ? fuelVoucherApi.claimQR(keys.current[type]) : fuelVoucherApi.claimMoMo(keys.current[type]))).data.data as Voucher;
      delete keys.current[type];
      setSelected(voucher);
      await refresh();
    } catch (error: any) {
      // A definite refusal (limit, eligibility) can't succeed on retry, so start fresh next time.
      if (error?.response?.status && error.response.status < 500) delete keys.current[type];
      Alert.alert(t("fuel.failed"), getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const open = async (v: Voucher) => {
    try { setSelected((await fuelVoucherApi.getVoucher(v.id)).data.data); }
    catch { setSelected(v); }
  };

  const statusLabel = (status: string) => t(`fuel.status_${status}`);
  const d = daily.data;

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={daily.isRefetching} onRefresh={() => void refresh()} tintColor={colors.primary} />}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeBack(router)} style={s.back}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={s.title}>{t("fuel.title")}</Text>
        <Text style={s.text}>{t("fuel.subtitle")}</Text>

        {daily.isPending ? <ActivityIndicator color={colors.primary} /> : daily.isError ? (
          <View style={s.card}>
            <Text style={s.text}>{getApiErrorMessage(daily.error)}</Text>
            <Button s={s} label={t("retry")} onPress={() => void daily.refetch()} />
          </View>
        ) : d && !d.eligible ? (
          <View style={[s.card, { borderColor: `${colors.primary}55` }]}>
            <View style={s.row}><Feather name="lock" size={18} color={colors.primary} /><Text style={s.heading}>{t("fuel.not_eligible")}</Text></View>
            <Text style={s.text}>{d.reason}</Text>
          </View>
        ) : d ? (
          <>
            <Text style={s.small}>{t("fuel.today")} · {t("fuel.resets")}</Text>
            <Option s={s} colors={colors} icon="maximize" title={t("fuel.qr_title")} help={t("fuel.qr_help")} amount={money(d.amount)}
              left={t("fuel.left", { count: String(Math.max(0, d.qrLimit - d.qrUsed)), limit: String(d.qrLimit) })}
              action={t("fuel.request_qr")} busy={busy === "qr"} disabled={!!busy || d.qrUsed >= d.qrLimit} onPress={() => void request("qr")} />
            {d.momoEnabled ? (
              <Option s={s} colors={colors} icon="smartphone" title={t("fuel.momo_title")} help={t("fuel.momo_help")} amount={money(d.amount)}
                left={t("fuel.left", { count: String(Math.max(0, d.momoLimit - d.momoUsed)), limit: String(d.momoLimit) })}
                action={t("fuel.request_momo")} busy={busy === "momo"} disabled={!!busy || d.momoUsed >= d.momoLimit} onPress={() => void request("momo")} />
            ) : <View style={s.card}><Text style={s.text}>{t("fuel.momo_off")}</Text></View>}
          </>
        ) : null}

        <View style={s.card}>
          <Text style={s.small}>{t("fuel.savings")}</Text>
          <Text style={[s.title, { color: colors.success }]}>{savings.data ? money(savings.data.weekTotal) : "—"}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.heading}>{t("fuel.history")}</Text>
          {history.isPending ? <ActivityIndicator color={colors.primary} /> : !history.data?.vouchers.length ? (
            <Text style={s.text}>{t("fuel.empty")}</Text>
          ) : history.data.vouchers.map((v) => (
            <TouchableOpacity key={v.id} accessibilityRole="button" onPress={() => void open(v)} style={s.listRow}>
              <Feather name={v.type === "qr" ? "maximize" : "smartphone"} size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{v.type === "qr" ? t("fuel.qr_title") : t("fuel.momo_title")} · {money(v.amount)}{v.source === "reward" ? ` · ${t("fuel.reward")}` : ""}</Text>
                <Text style={s.small}>{new Date(v.issuedAt).toLocaleString()}</Text>
              </View>
              <Text style={[s.badge, { color: ["redeemed", "paid"].includes(v.status) ? colors.success : ["expired", "returned"].includes(v.status) ? colors.textSecondary : colors.primary }]}>{statusLabel(v.status)}</Text>
            </TouchableOpacity>
          ))}
          {history.data && history.data.total > 20 ? (
            <View style={s.row}>
              <Button s={s} secondary label={t("fuel.previous")} disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
              <Button s={s} secondary label={t("fuel.next")} disabled={page * 20 >= history.data.total} onPress={() => setPage((p) => p + 1)} />
            </View>
          ) : null}
        </View>

        <View style={s.card}>
          <Text style={s.heading}>{t("fuel.stations")}</Text>
          {stations.isPending ? <ActivityIndicator color={colors.primary} /> : !stations.data?.length ? (
            <Text style={s.text}>{t("fuel.no_stations")}</Text>
          ) : stations.data.map((st) => (
            <View key={st.id} style={s.listRow}>
              <Feather name="map-pin" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{st.name}</Text>
                <Text style={s.small}>{st.address}{st.distanceKm != null ? ` · ${t("fuel.away", { km: String(st.distanceKm) })}` : ""}</Text>
              </View>
              {st.acceptsQr ? <Text style={[s.badge, { color: colors.success }]}>{t("fuel.accepts_qr")}</Text> : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal transparent visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={[s.backdrop, wide && { justifyContent: "center", alignItems: "center", padding: 24 }]} onPress={() => setSelected(null)}>
          <Pressable style={[s.sheet, wide && { width: "100%", maxWidth: 480, borderRadius: 24, paddingBottom: 24 }]} onPress={() => {}}>
            {selected ? (
              <>
                <Text style={s.heading}>{selected.type === "qr" ? t("fuel.qr_title") : t("fuel.momo_title")} · {money(selected.amount)}</Text>
                <Text style={[s.badge, { alignSelf: "flex-start", color: colors.primary }]}>{statusLabel(selected.status)}</Text>
                {selected.type === "qr" && selected.status === "active" && selected.qrCode ? (
                  <>
                    <Text style={s.text}>{t("fuel.show_attendant")}</Text>
                    <View style={s.qrBox}><QRCode value={selected.qrCode} size={220} /></View>
                    <Text selectable style={s.code}>{selected.code}</Text>
                    {selected.expiresAt ? <Text style={[s.small, { textAlign: "center" }]}>{t("fuel.expires", { time: time(selected.expiresAt) })}</Text> : null}
                  </>
                ) : (
                  <>
                    <Text style={s.small}>{t("fuel.code")}: {selected.code}</Text>
                    {selected.note ? <Text style={s.text}>{selected.note}</Text> : null}
                  </>
                )}
                <Button s={s} label={t("fuel.close")} onPress={() => setSelected(null)} />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Option({ s, colors, icon, title, help, amount, left, action, busy, disabled, onPress }: { s: ReturnType<typeof styles>; colors: ThemeColors; icon: React.ComponentProps<typeof Feather>["name"]; title: string; help: string; amount: string; left: string; action: string; busy: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.icon}><Feather name={icon} size={20} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>{title}</Text>
          <Text style={s.small}>{amount} · {left}</Text>
        </View>
      </View>
      <Text style={s.text}>{help}</Text>
      <Button s={s} label={action} busy={busy} disabled={disabled} onPress={onPress} />
    </View>
  );
}

function Button({ s, label, onPress, disabled, busy, secondary }: { s: ReturnType<typeof styles>; label: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !!disabled, busy: !!busy }} disabled={disabled || busy} onPress={onPress}
      style={[secondary ? s.secondary : s.button, { flex: secondary ? 1 : undefined }, (disabled || busy) && { opacity: 0.45 }]}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={secondary ? s.secondaryText : s.buttonText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: 16, gap: 14, width: "100%", maxWidth: 720, alignSelf: "center" },
  back: { width: 44, height: 44, justifyContent: "center" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: c.textPrimary },
  heading: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.textPrimary },
  text: { fontSize: 15, lineHeight: 22, color: c.textSecondary },
  small: { fontSize: 13, color: c.textSecondary },
  card: { backgroundColor: c.backgroundCard, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: `${c.primary}18` },
  button: { minHeight: 50, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  secondary: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: c.textPrimary, fontFamily: "Inter_600SemiBold" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textPrimary },
  badge: { fontSize: 12, fontFamily: "Inter_700Bold" },
  backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 12 },
  qrBox: { alignSelf: "center", backgroundColor: "#fff", padding: 16, borderRadius: 16 },
  code: { textAlign: "center", fontSize: 18, fontFamily: "Inter_700Bold", color: c.textPrimary, letterSpacing: 1 },
});
