import { useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { getApiErrorMessage, movingApi } from "@/services/api";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Alert } from "@/components/GlobalAlert";
import { rideStyles } from "@/components/passenger/ride/rideStyles";
import { StatusPill } from "@/components/moving/StatusPill";
import { MOVING_SUPPORT_PHONE, TRUCK_PHOTOS, money, range, type Move, type MoveStatus, type TruckKey } from "@/constants/moving";
import { callNumber } from "@/utils/share";

const CANCELLABLE: MoveStatus[] = ["requested", "visit_scheduled", "visited", "quoted", "accepted", "confirmed"];
const when = (iso?: string | null, time = false) => (iso ? new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—");

/** One move: progress, the team's price (accept it here), the partner truck and every detail sent. */
export default function MoveDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const client = useQueryClient();
  const [busy, setBusy] = useState<null | "accept" | "cancel">(null);
  const q = useQuery({ queryKey: ["moving", "move", id], enabled: !!id, refetchInterval: 60_000, queryFn: async () => (await movingApi.get(String(id))).data.data as Move });
  const m = q.data;

  const act = async (kind: "accept" | "cancel") => {
    if (busy || !m) return;
    setBusy(kind);
    try {
      const res = kind === "accept" ? await movingApi.accept(m._id) : await movingApi.cancel(m._id);
      client.setQueryData(["moving", "move", id], res.data.data);
      void client.invalidateQueries({ queryKey: ["moving", "mine"] });
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e));
    } finally { setBusy(null); }
  };
  const confirmCancel = () => Alert.alert(t("move.cancel_confirm_title"), t("move.cancel_confirm_body"), [{ text: t("move.keep"), style: "cancel" }, { text: t("move.cancel"), style: "destructive", onPress: () => void act("cancel") }]);

  if (!m) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 }}>
        <ScreenHeader title={t("move.brand")} />
        {q.isLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={s.error}>{q.error ? getApiErrorMessage(q.error) : t("move.error_load")}</Text>}
      </View>
    );
  }

  const photo = TRUCK_PHOTOS[(m.truckKey || "medium") as TruckKey] || TRUCK_PHOTOS.medium;
  const stop = (label: string, x: Move["from"], icon: any, color: string) => (
    <View style={[s.row, { alignItems: "flex-start" }]}>
      <View style={[s.iconBubble, { backgroundColor: `${color}22` }]}><Feather name={icon} size={15} color={color} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.subtitle}>{label}</Text>
        <Text style={s.body}>{x.name}</Text>
        <Text style={s.subtitle}>{[t(`move.pt_${x.placeType}`), x.floor ? t("move.floor_n", { n: String(x.floor) }) : t("move.floor_ground"), t(`move.access_${x.truckAccess}`)].join(" · ")}</Text>
        {x.landmark ? <Text style={s.subtitle}>{x.landmark}</Text> : null}
      </View>
    </View>
  );
  const done = new Set(m.statusHistory.map((h) => h.status));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 + insets.bottom, width: "100%", maxWidth: 760, alignSelf: "center", gap: 14 }}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.primary} />}>
      <ScreenHeader title={m.ref} subtitle={t("move.brand")} action={<StatusPill status={m.status} />} />

      {m.status === "quoted" && m.quote?.amount ? (
        <View style={[s.card, { gap: 10, borderColor: colors.primary, borderWidth: 2 }]}>
          <Text style={s.label}>{t("move.quote_title")}</Text>
          <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 28 }}>{money(m.quote.amount)}</Text>
          {m.quote.note ? <Text style={s.subtitle}>{m.quote.note}</Text> : null}
          <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => act("accept")} style={[s.primaryBtn, busy && { opacity: 0.6 }]}>
            {busy === "accept" ? <ActivityIndicator color="#fff" /> : <><Feather name="check" size={18} color="#fff" /><Text style={s.primaryText}>{t("move.accept_quote")}</Text></>}
          </TouchableOpacity>
        </View>
      ) : m.quote?.amount && ["accepted", "confirmed", "in_progress", "completed"].includes(m.status) ? (
        <View style={[s.card, s.row, { justifyContent: "space-between" }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{t("move.quote_title")}</Text>
            {m.quote.note ? <Text style={s.subtitle}>{m.quote.note}</Text> : null}
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 20 }}>{money(m.quote.amount)}</Text>
        </View>
      ) : null}

      {m.partner?.plate && ["confirmed", "in_progress", "completed"].includes(m.status) ? (
        <View style={[s.card, { gap: 10 }]}>
          <Text style={s.label}>{t("move.partner_title")}</Text>
          <View style={s.row}>
            <Image source={photo} style={{ width: 84, height: 54, borderRadius: 10 }} accessibilityIgnoresInvertColors />
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontFamily: "Inter_700Bold" }]}>{m.partner.plate}</Text>
              <Text style={s.subtitle}>{[m.partner.driverName, m.partner.company].filter(Boolean).join(" · ")}</Text>
            </View>
            {m.partner.phone ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("move.call")} onPress={() => callNumber(m.partner!.phone!)} style={s.stepBtn}><Feather name="phone" size={18} color={colors.primary} /></TouchableOpacity> : null}
          </View>
        </View>
      ) : null}

      <View style={[s.card, { gap: 10 }]}>
        <Text style={s.label}>{t("move.timeline")}</Text>
        {(m.wantsVisit ? ["requested", "visit_scheduled", "visited", "quoted", "accepted", "confirmed", "in_progress", "completed"] : ["requested", "quoted", "accepted", "confirmed", "in_progress", "completed"]).map((st) => {
          const reached = done.has(st as MoveStatus);
          const at = [...m.statusHistory].reverse().find((h) => h.status === st)?.at;
          return (
            <View key={st} style={s.row}>
              <Feather name={reached ? "check-circle" : "circle"} size={18} color={reached ? colors.success : colors.textTertiary} />
              <Text style={[s.body, { flex: 1, color: reached ? colors.textPrimary : colors.textTertiary }]}>{t(`move.status_${st}`)}</Text>
              {at ? <Text style={s.subtitle}>{when(at, true)}</Text> : null}
            </View>
          );
        })}
        {m.status === "cancelled" ? <View style={s.row}><Feather name="x-circle" size={18} color={colors.error} /><Text style={[s.body, { color: colors.error }]}>{t("move.status_cancelled")}</Text></View> : null}
      </View>

      <View style={[s.card, { gap: 12 }]}>
        <Text style={s.label}>{t("move.details")}</Text>
        {stop(t("move.from_title"), m.from, "circle", colors.success)}
        {stop(t("move.to_title"), m.to, "map-pin", colors.primary)}
        <View style={s.divider} />
        <Text style={s.body}>{t(`move.size_${m.homeSize}`)}{m.items.length ? ` · ${m.items.map((it) => `${it.qty} ${t(`move.item_${it.key}`)}`).join(", ")}` : ""}</Text>
        {m.wantsVisit ? <Text style={s.body}>{t("move.visit_at", { date: m.visit?.scheduledAt ? when(m.visit.scheduledAt, true) : `${when(m.visit?.preferredDate)} · ${t(`move.tw_${m.visit?.timeWindow || "any"}`)}` })}</Text> : null}
        <Text style={s.body}>{t("move.move_on", { date: `${when(m.moveDate)} · ${t(`move.tw_${m.timeWindow}`)}` })}</Text>
        <Text style={s.subtitle}>{[t("move.with_loaders", { n: String(m.loaders) }), m.packing && t("move.packing_short"), m.assembly && t("move.assembly_short")].filter(Boolean).join(" · ")}</Text>
        {m.estimate ? <Text style={s.subtitle}>{t("move.estimate")}: {range(m.estimate.min, m.estimate.max)} · {t("move.distance", { km: String(m.estimate.distanceKm) })}</Text> : null}
        {m.notes ? <Text style={s.subtitle}>“{m.notes}”</Text> : null}
      </View>

      {MOVING_SUPPORT_PHONE ? (
        <TouchableOpacity accessibilityRole="button" onPress={() => callNumber(MOVING_SUPPORT_PHONE)} style={s.secondaryBtn}>
          <Feather name="phone" size={17} color={colors.textPrimary} /><Text style={s.secondaryText}>{t("move.call_team")}</Text>
        </TouchableOpacity>
      ) : null}
      {CANCELLABLE.includes(m.status) ? (
        <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={confirmCancel} style={[s.secondaryBtn, { borderColor: colors.error }]}>
          {busy === "cancel" ? <ActivityIndicator color={colors.error} /> : <Text style={[s.secondaryText, { color: colors.error }]}>{t("move.cancel")}</Text>}
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}
