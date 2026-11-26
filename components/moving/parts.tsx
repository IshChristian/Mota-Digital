import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { mapsApi, type Place } from "@/services/api";
import { rideStyles } from "@/components/passenger/ride/rideStyles";
import { range, truckPhoto, type MoveStop, type Truck } from "@/constants/moving";

/** Row of selectable chips. */
/** Photo at a fixed shape. (Images ignore aspectRatio in the browser, so the box sets the size.) */
export function Photo({ source, ratio, radius = 0, style }: { source: any; ratio: number; radius?: number; style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: "100%", aspectRatio: ratio, borderRadius: radius, overflow: "hidden", backgroundColor: colors.sectionBg }, style]}>
      <Image source={source} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T | null | undefined; onChange: (v: T) => void; label: (v: T) => string }) {
  const { colors } = useTheme();
  const s = rideStyles(colors);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <TouchableOpacity key={o} accessibilityRole="radio" accessibilityState={{ selected: value === o }} onPress={() => onChange(o)} style={[s.chip, value === o && s.chipActive]}>
          <Text style={s.chipText}>{label(o)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** − n + counter. */
export function Stepper({ value, onChange, min = 0, max = 99, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label?: string }) {
  const { colors } = useTheme();
  const s = rideStyles(colors);
  return (
    <View style={[s.row, { gap: 12 }]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Less ${label || ""}`} disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))} style={[s.stepBtn, value <= min && { opacity: 0.4 }]}><Feather name="minus" size={18} color={colors.textPrimary} /></TouchableOpacity>
      <Text style={[s.body, { minWidth: 28, textAlign: "center", fontFamily: "Inter_700Bold" }]}>{value}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`More ${label || ""}`} disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))} style={[s.stepBtn, value >= max && { opacity: 0.4 }]}><Feather name="plus" size={18} color={colors.textPrimary} /></TouchableOpacity>
    </View>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: "phone-pad" | "default"; multiline?: boolean }) {
  const { colors } = useTheme();
  const s = rideStyles(colors);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.subtitle}>{label}</Text>
      <View style={[s.inputBox, multiline && { alignItems: "flex-start" }]}>
        <TextInput style={[s.input, multiline && { minHeight: 80, textAlignVertical: "top" }]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textTertiary} keyboardType={keyboardType} multiline={multiline} accessibilityLabel={label} />
      </View>
    </View>
  );
}

/** Search a place, or use the phone's location. Shows the chosen place with a Change link. */
export function PlacePicker({ value, onChange, near }: { value: Place | null; onChange: (p: Place | null) => void; near?: { latitude: number; longitude: number } }) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const id = ++seq.current;
    if (q.length < 3) { setResults([]); setBusy(false); setError(""); return; }
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await mapsApi.search(q, near);
        if (id === seq.current) { setResults(res.data.data); setError(res.data.data.length ? "" : "No places found. Try another name."); }
      } catch (e: any) {
        if (id === seq.current) setError(e?.response?.data?.message || e?.message || "Search is unavailable.");
      } finally {
        if (id === seq.current) setBusy(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const useCurrent = async () => {
    setBusy(true); setError("");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") throw new Error("Location permission is off. Search the place instead.");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      let place: Place = { name: "Current location", ...point };
      try { const r = await mapsApi.reverse(point); if (r.data?.data?.name) place = { ...r.data.data, ...point }; } catch { /* keep coordinates */ }
      onChange(place);
    } catch (e: any) {
      setError(e?.message || "Couldn't get your location.");
    } finally { setBusy(false); }
  };

  if (value) {
    return (
      <View style={[s.card, s.row]}>
        <View style={s.iconBubble}><Feather name="map-pin" size={16} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.body} numberOfLines={1}>{value.name}</Text>
          {value.address ? <Text style={s.subtitle} numberOfLines={2}>{value.address}</Text> : null}
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={() => onChange(null)}><Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{t("move.change")}</Text></TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={s.inputBox}>
        <Feather name="search" size={18} color={colors.primary} />
        <TextInput style={s.input} value={query} onChangeText={setQuery} placeholder={t("move.search_place")} placeholderTextColor={colors.textTertiary} accessibilityLabel={t("move.search_place")} />
        {busy ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>
      <TouchableOpacity accessibilityRole="button" onPress={useCurrent} style={s.row}><Feather name="crosshair" size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{t("move.use_current")}</Text></TouchableOpacity>
      {error ? <Text style={s.error}>{error}</Text> : null}
      {results.map((place, i) => (
        <TouchableOpacity key={`${place.latitude},${place.longitude},${i}`} style={s.listItem} onPress={() => { seq.current++; setQuery(""); setResults([]); onChange(place); }} accessibilityRole="button">
          <View style={s.iconBubble}><Feather name="map-pin" size={16} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.body} numberOfLines={1}>{place.name}</Text>
            {place.address ? <Text style={s.subtitle} numberOfLines={1}>{place.address}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export type StopForm = Omit<MoveStop, "name" | "latitude" | "longitude" | "address"> & { place: Place | null };
export const emptyStop = (): StopForm => ({ place: null, placeType: "house", floor: 0, hasElevator: false, truckAccess: "at_door", landmark: "", contactName: "", contactPhone: "" });

/** Everything the team needs to find the place and plan the carrying. */
export function StopDetails({ title, value, onChange, near }: { title: string; value: StopForm; onChange: (v: StopForm) => void; near?: { latitude: number; longitude: number } }) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const set = (patch: Partial<StopForm>) => onChange({ ...value, ...patch });
  return (
    <View style={[s.card, { gap: 14 }]}>
      <Text style={[s.title, { fontSize: 17 }]}>{title}</Text>
      <PlacePicker value={value.place} onChange={(place) => set({ place })} near={near} />
      <Text style={s.subtitle}>{t("move.place_type")}</Text>
      <Chips options={["house", "apartment", "office", "shop", "other"] as const} value={value.placeType} onChange={(placeType) => set({ placeType })} label={(v) => t(`move.pt_${v}`)} />
      <View style={[s.row, { justifyContent: "space-between", flexWrap: "wrap" }]}>
        <View style={{ gap: 4 }}>
          <Text style={s.subtitle}>{t("move.floor")}</Text>
          <Text style={s.body}>{value.floor === 0 ? t("move.floor_ground") : t("move.floor_n", { n: String(value.floor) })}</Text>
        </View>
        <Stepper value={value.floor} onChange={(floor) => set({ floor })} max={30} label={t("move.floor")} />
      </View>
      {value.floor > 0 ? (
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.body}>{t("move.elevator")}</Text>
          <Switch value={value.hasElevator} onValueChange={(hasElevator) => set({ hasElevator })} trackColor={{ true: colors.primary }} accessibilityLabel={t("move.elevator")} />
        </View>
      ) : null}
      <Text style={s.subtitle}>{t("move.access")}</Text>
      <Chips options={["at_door", "short_walk", "long_walk"] as const} value={value.truckAccess} onChange={(truckAccess) => set({ truckAccess })} label={(v) => t(`move.access_${v}`)} />
      <Field label={t("move.landmark")} value={value.landmark} onChangeText={(landmark) => set({ landmark })} placeholder={t("move.landmark_hint")} />
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 180 }}><Field label={t("move.contact_name")} value={value.contactName} onChangeText={(contactName) => set({ contactName })} /></View>
        <View style={{ flex: 1, minWidth: 180 }}><Field label={t("move.contact_phone")} value={value.contactPhone} onChangeText={(contactPhone) => set({ contactPhone })} keyboardType="phone-pad" /></View>
      </View>
    </View>
  );
}

/** A truck to choose: real photo, size, what it fits and the price range. */
export function TruckCard({ truck, selected, recommended, onPress }: { truck: Truck; selected: boolean; recommended: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const fitsKey = `move.fits_${truck.key}`;
  const fits = t(fitsKey) === fitsKey ? truck.fits : t(fitsKey);
  return (
    <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${truck.name}, ${fits}, ${range(truck.priceMin, truck.priceMax)}`} onPress={onPress}
      style={{ borderRadius: 18, overflow: "hidden", borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.backgroundElevated }}>
      <View>
        <Photo source={truckPhoto(truck)} ratio={1.6} />
        <View style={{ position: "absolute", left: 10, bottom: 10, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{t("move.photo_note")}</Text>
        </View>
        {recommended ? (
          <View style={{ position: "absolute", left: 10, top: 10, backgroundColor: colors.success, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", gap: 4, alignItems: "center" }}>
            <Feather name="thumbs-up" size={12} color="#fff" /><Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" }}>{t("move.recommended")}</Text>
          </View>
        ) : null}
        {selected ? <View style={{ position: "absolute", right: 10, top: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><Feather name="check" size={18} color="#fff" /></View> : null}
      </View>
      <View style={{ padding: 14, gap: 6 }}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { fontSize: 18 }]}>{truck.name}</Text>
            <Text style={s.subtitle}>{truck.model}</Text>
          </View>
          <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 16 }}>{range(truck.priceMin, truck.priceMax)}</Text>
        </View>
        <View style={[s.row, { flexWrap: "wrap", gap: 14 }]}>
          <View style={[s.row, { gap: 6 }]}><Feather name="package" size={14} color={colors.textSecondary} /><Text style={s.subtitle}>{t("move.capacity", { t: String(truck.capacityTonnes) })}</Text></View>
          <View style={[s.row, { gap: 6 }]}><Feather name="home" size={14} color={colors.textSecondary} /><Text style={s.subtitle}>{fits}</Text></View>
        </View>
        {truck.photoCredit ? <Text style={{ color: colors.textTertiary, fontSize: 10 }}>{truck.photoCredit}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}
