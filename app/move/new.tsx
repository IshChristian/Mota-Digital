import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { getApiErrorMessage, movingApi } from "@/services/api";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Alert } from "@/components/GlobalAlert";
import DateTimePicker from "@/components/ui/DateTimePicker";
import { rideStyles } from "@/components/passenger/ride/rideStyles";
import { Chips, Field, StopDetails, Stepper, TruckCard, emptyStop, type StopForm } from "@/components/moving/parts";
import { HOME_SIZES, ITEM_ICONS, ITEM_KEYS, money, type MovingCatalog } from "@/constants/moving";

const STEPS = ["where", "what", "truck", "when", "review"] as const;
type Window = "morning" | "afternoon" | "evening" | "any";
type Estimate = { truckKey: string; recommendedKey: string; distanceKm: number; min: number; max: number; breakdown: Record<string, number> };

const stopBody = (s: StopForm) => ({
  name: s.place!.name, address: s.place!.address || "", latitude: s.place!.latitude, longitude: s.place!.longitude,
  placeType: s.placeType, floor: s.floor, hasElevator: s.floor > 0 && s.hasElevator, truckAccess: s.truckAccess,
  landmark: s.landmark.trim(), contactName: s.contactName.trim(), contactPhone: s.contactPhone.trim(),
});
const dateText = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—");
const today = () => new Date(new Date().setHours(0, 0, 0, 0));

/** MOTA HomeMove booking: where → what → truck (or free home visit) → when → review. */
export default function NewMoveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const t = useT();
  const s = rideStyles(colors);
  const params = useLocalSearchParams<{ src?: string; c?: string }>();

  const catalog = useQuery({ queryKey: ["moving", "catalog"], queryFn: async () => (await movingApi.catalog()).data.data as MovingCatalog, staleTime: 10 * 60 * 1000 });
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState<StopForm>(emptyStop());
  const [to, setTo] = useState<StopForm>(emptyStop());
  const [homeSize, setHomeSize] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, number>>({});
  const [truckKey, setTruckKey] = useState<string | null>(null);
  const [wantsVisit, setWantsVisit] = useState(false);
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [visitWindow, setVisitWindow] = useState<Window>("any");
  const [moveDate, setMoveDate] = useState<Date | null>(null);
  const [timeWindow, setTimeWindow] = useState<Window>("morning");
  const [loaders, setLoaders] = useState(2);
  const [packing, setPacking] = useState(false);
  const [assembly, setAssembly] = useState(false);
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [picker, setPicker] = useState<null | "move" | "visit">(null);
  const [error, setError] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!phone && user?.phone) setPhone(user.phone); }, [user?.phone]);
  const near = from.place ? { latitude: from.place.latitude, longitude: from.place.longitude } : undefined;
  const itemList = Object.entries(items).filter(([, q]) => q > 0).map(([key, qty]) => ({ key, qty }));

  // Same rule as the server: the truck listed for this home size, one size up for lots of things.
  const recommended = useMemo(() => {
    const trucks = [...(catalog.data?.trucks || [])].sort((a, b) => a.capacityTonnes - b.capacityTonnes);
    if (!homeSize || !trucks.length) return null;
    let i = trucks.findIndex((x) => x.homeSizes.includes(homeSize));
    if (i < 0) i = trucks.length - 1;
    if (itemList.reduce((n, it) => n + it.qty, 0) > 40 && i < trucks.length - 1) i += 1;
    return trucks[i].key;
  }, [catalog.data, homeSize, items]);

  const body = () => ({
    from: stopBody(from), to: stopBody(to), homeSize, items: itemList,
    truckKey: wantsVisit ? null : truckKey, wantsVisit, loaders, packing, assembly,
    moveDate: moveDate?.toISOString() || null, timeWindow,
    visit: wantsVisit ? { preferredDate: visitDate?.toISOString(), timeWindow: visitWindow } : undefined,
    notes: notes.trim(), contactPhone: phone.replace(/\s/g, ""),
    source: params.src ? String(params.src).slice(0, 40) : "app", campaign: params.c ? String(params.c).slice(0, 60) : "",
  });

  const check = (n: number): string => {
    if (n === 0) {
      if (!from.place) return t("move.need_from");
      if (!to.place) return t("move.need_to");
    }
    if (n === 1 && !homeSize) return t("move.need_size");
    if (n === 2 && !wantsVisit && !truckKey) return t("move.need_truck");
    if (n === 3) {
      if (wantsVisit && !visitDate) return t("move.need_visit_date");
      if (!wantsVisit && !moveDate) return t("move.need_date");
      if (!/^\+?\d{9,13}$/.test(phone.replace(/\s/g, ""))) return t("move.need_phone");
    }
    return "";
  };

  const loadEstimate = async () => {
    setEstimating(true);
    try { setEstimate((await movingApi.estimate(body())).data.data); }
    catch (e) { setEstimate(null); setError(getApiErrorMessage(e)); }
    finally { setEstimating(false); }
  };

  const next = () => {
    const problem = check(step);
    setError(problem);
    if (problem) return;
    if (step === 1 && !truckKey && recommended) setTruckKey(recommended);
    const n = Math.min(STEPS.length - 1, step + 1);
    setStep(n);
    if (STEPS[n] === "review") void loadEstimate();
  };
  const back = () => { setError(""); if (step === 0) router.back(); else setStep(step - 1); };

  const submit = async () => {
    if (submitting) return;
    for (let i = 0; i < 4; i++) { const p = check(i); if (p) { setStep(i); setError(p); return; } }
    setSubmitting(true); setError("");
    try {
      const move = (await movingApi.create(body())).data.data;
      Alert.alert(t("move.submitted_title"), t("move.submitted_body", { ref: move.ref }));
      router.replace(`/move/${move._id}` as any);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally { setSubmitting(false); }
  };

  const chooseDate = (_e: unknown, d?: Date) => {
    const field = picker;
    setPicker(null);
    if (!d) return;
    if (field === "move") setMoveDate(d); else if (field === "visit") setVisitDate(d);
  };

  const ex = catalog.data?.extras;
  const truck = catalog.data?.trucks.find((x) => x.key === (wantsVisit ? estimate?.truckKey : truckKey));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom, width: "100%", maxWidth: 760, alignSelf: "center", gap: 16 }} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={t("move.brand")} subtitle={t("move.step_of", { n: String(step + 1), total: String(STEPS.length) }) + " · " + t(`move.step_${STEPS[step]}`)} />
        <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}>
          {STEPS.map((k, i) => <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? colors.primary : colors.border }} />)}
        </View>

        {STEPS[step] === "where" ? (
          <>
            <StopDetails title={t("move.from_title")} value={from} onChange={setFrom} />
            <StopDetails title={t("move.to_title")} value={to} onChange={setTo} near={near} />
          </>
        ) : null}

        {STEPS[step] === "what" ? (
          <>
            <View style={[s.card, { gap: 12 }]}>
              <Text style={[s.title, { fontSize: 17 }]}>{t("move.size_title")}</Text>
              <Chips options={HOME_SIZES} value={homeSize as any} onChange={(v) => { setHomeSize(v); setTruckKey(null); }} label={(v) => t(`move.size_${v}`)} />
            </View>
            <View style={[s.card, { gap: 4 }]}>
              <Text style={[s.title, { fontSize: 17, marginBottom: 6 }]}>{t("move.items_title")}</Text>
              {ITEM_KEYS.map((key) => (
                <View key={key} style={[s.row, { justifyContent: "space-between", paddingVertical: 6 }]}>
                  <View style={[s.row, { flex: 1 }]}>
                    <View style={s.iconBubble}><Feather name={ITEM_ICONS[key] as any} size={16} color={colors.primary} /></View>
                    <Text style={s.body}>{t(`move.item_${key}`)}</Text>
                  </View>
                  <Stepper value={items[key] || 0} onChange={(n) => setItems({ ...items, [key]: n })} max={key === "boxes" || key === "bags" ? 200 : 30} label={t(`move.item_${key}`)} />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {STEPS[step] === "truck" ? (
          <>
            <View style={{ gap: 4 }}>
              <Text style={s.title}>{t("move.truck_title")}</Text>
              <Text style={s.subtitle}>{t("move.truck_sub")}</Text>
            </View>
            {catalog.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {catalog.error ? <Text style={s.error}>{getApiErrorMessage(catalog.error)}</Text> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
              {(catalog.data?.trucks || []).map((x) => (
                <View key={x.key} style={{ flexGrow: 1, flexBasis: 300 }}>
                  <TruckCard truck={x} selected={!wantsVisit && truckKey === x.key} recommended={recommended === x.key} onPress={() => { setTruckKey(x.key); setWantsVisit(false); setError(""); }} />
                </View>
              ))}
            </View>
            <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: wantsVisit }} onPress={() => { setWantsVisit(!wantsVisit); setError(""); }}
              style={[s.card, s.row, { alignItems: "flex-start", borderWidth: wantsVisit ? 2 : 1, borderColor: wantsVisit ? colors.primary : colors.border }]}>
              <View style={[s.iconBubble, { backgroundColor: `${colors.success}22` }]}><Feather name="clipboard" size={16} color={colors.success} /></View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[s.body, { fontFamily: "Inter_700Bold" }]}>{t("move.visit_title")}</Text>
                <Text style={s.subtitle}>{t("move.visit_body")}</Text>
              </View>
              <Feather name={wantsVisit ? "check-circle" : "circle"} size={22} color={wantsVisit ? colors.primary : colors.textTertiary} />
            </TouchableOpacity>
          </>
        ) : null}

        {STEPS[step] === "when" ? (
          <View style={[s.card, { gap: 14 }]}>
            {wantsVisit ? (
              <>
                <Text style={[s.title, { fontSize: 17 }]}>{t("move.visit_title")}</Text>
                <DateButton label={t("move.visit_date")} value={visitDate} onPress={() => setPicker("visit")} />
                <Chips options={["morning", "afternoon", "evening", "any"] as const} value={visitWindow} onChange={setVisitWindow} label={(v) => t(`move.tw_${v}`)} />
                <View style={s.divider} />
              </>
            ) : null}
            <Text style={[s.title, { fontSize: 17 }]}>{t("move.when_title")}</Text>
            <DateButton label={wantsVisit ? t("move.move_date_optional") : t("move.move_date")} value={moveDate} onPress={() => setPicker("move")} />
            <Text style={s.subtitle}>{t("move.time_window")}</Text>
            <Chips options={["morning", "afternoon", "evening", "any"] as const} value={timeWindow} onChange={setTimeWindow} label={(v) => t(`move.tw_${v}`)} />
            <View style={s.divider} />
            <View style={[s.row, { justifyContent: "space-between", flexWrap: "wrap" }]}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={s.body}>{t("move.loaders")}</Text>
                {ex ? <Text style={s.subtitle}>{t("move.loaders_hint", { price: money(ex.loaderPrice) })}</Text> : null}
              </View>
              <Stepper value={loaders} onChange={setLoaders} max={ex?.maxLoaders || 12} label={t("move.loaders")} />
            </View>
            <Toggle label={t("move.packing")} hint={`${t("move.packing_hint")}${ex ? ` · +${money(ex.packingPrice)}` : ""}`} value={packing} onChange={setPacking} />
            <Toggle label={t("move.assembly")} hint={`${t("move.assembly_hint")}${ex ? ` · +${money(ex.assemblyPrice)}` : ""}`} value={assembly} onChange={setAssembly} />
            <View style={s.divider} />
            <Field label={t("move.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label={t("move.notes")} value={notes} onChangeText={setNotes} multiline />
          </View>
        ) : null}

        {STEPS[step] === "review" ? (
          <>
            <Text style={s.title}>{t("move.review_title")}</Text>
            <View style={[s.card, { gap: 8, borderColor: colors.primary }]}>
              <Text style={s.label}>{t("move.estimate")}</Text>
              {estimating ? <ActivityIndicator color={colors.primary} /> : estimate ? (
                <>
                  <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 26 }}>{money(estimate.min)} – {money(estimate.max)}</Text>
                  <Text style={s.subtitle}>{t("move.distance", { km: String(estimate.distanceKm) })}</Text>
                </>
              ) : <TouchableOpacity onPress={loadEstimate}><Text style={{ color: colors.primary }}>↻</Text></TouchableOpacity>}
              <Text style={s.subtitle}>{t("move.estimate_note")}</Text>
            </View>
            <View style={[s.card, { gap: 10 }]}>
              <Summary icon="circle" color={colors.success} title={t("move.from_title")} text={from.place?.name} sub={[t(`move.pt_${from.placeType}`), from.floor ? t("move.floor_n", { n: String(from.floor) }) : t("move.floor_ground"), t(`move.access_${from.truckAccess}`), from.landmark].filter(Boolean).join(" · ")} />
              <Summary icon="map-pin" color={colors.primary} title={t("move.to_title")} text={to.place?.name} sub={[t(`move.pt_${to.placeType}`), to.floor ? t("move.floor_n", { n: String(to.floor) }) : t("move.floor_ground"), t(`move.access_${to.truckAccess}`), to.landmark].filter(Boolean).join(" · ")} />
              <View style={s.divider} />
              <Summary icon="home" title={t(`move.size_${homeSize}`)} text={itemList.map((it) => `${it.qty} ${t(`move.item_${it.key}`)}`).join(", ") || "—"} />
              <Summary icon="truck" title={wantsVisit ? t("move.visit_title") : truck?.name || ""} text={wantsVisit ? `${dateText(visitDate)} · ${t(`move.tw_${visitWindow}`)}` : truck?.model || ""} />
              <Summary icon="calendar" title={t("move.when_title")} text={`${dateText(moveDate)} · ${t(`move.tw_${timeWindow}`)}`} sub={[t("move.with_loaders", { n: String(loaders) }), packing && t("move.packing_short"), assembly && t("move.assembly_short")].filter(Boolean).join(" · ")} />
              <Summary icon="phone" title={t("move.phone")} text={phone} />
            </View>
          </>
        ) : null}

        {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity accessibilityRole="button" onPress={back} style={[s.secondaryBtn, { flex: 1 }]}><Text style={s.secondaryText}>{t("move.back")}</Text></TouchableOpacity>
          {STEPS[step] === "review" ? (
            <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={submit} style={[s.primaryBtn, { flex: 2 }, submitting && { opacity: 0.6 }]}>
              {submitting ? <ActivityIndicator color="#fff" /> : <><Feather name="send" size={18} color="#fff" /><Text style={s.primaryText}>{t("move.submit")}</Text></>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity accessibilityRole="button" onPress={next} style={[s.primaryBtn, { flex: 2 }]}><Text style={s.primaryText}>{t("move.next")}</Text><Feather name="arrow-right" size={18} color="#fff" /></TouchableOpacity>
          )}
        </View>
      </ScrollView>
      {picker ? <DateTimePicker value={(picker === "move" ? moveDate : visitDate) || today()} mode="date" minimumDate={today()} onValueChange={chooseDate} onDismiss={() => setPicker(null)} /> : null}
    </KeyboardAvoidingView>
  );
}

function DateButton({ label, value, onPress }: { label: string; value: Date | null; onPress: () => void }) {
  const { colors } = useTheme();
  const s = rideStyles(colors);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.subtitle}>{label}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[s.inputBox, { minHeight: 50 }]}>
        <Feather name="calendar" size={18} color={colors.primary} />
        <Text style={[s.body, { flex: 1, color: value ? colors.textPrimary : colors.textTertiary }]}>{value ? dateText(value) : label}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  const s = rideStyles(colors);
  return (
    <View style={[s.row, { justifyContent: "space-between" }]}>
      <View style={{ flex: 1, gap: 2 }}><Text style={s.body}>{label}</Text><Text style={s.subtitle}>{hint}</Text></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} accessibilityLabel={label} />
    </View>
  );
}

function Summary({ icon, color, title, text, sub }: { icon: any; color?: string; title: string; text?: string; sub?: string }) {
  const { colors } = useTheme();
  const s = rideStyles(colors);
  return (
    <View style={[s.row, { alignItems: "flex-start" }]}>
      <View style={s.iconBubble}><Feather name={icon} size={15} color={color || colors.primary} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.subtitle}>{title}</Text>
        <Text style={s.body}>{text || "—"}</Text>
        {sub ? <Text style={s.subtitle}>{sub}</Text> : null}
      </View>
    </View>
  );
}
