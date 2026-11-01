import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { mapsApi, placesApi, type Place } from "@/services/api";
import { rideStyles } from "./rideStyles";

type SavedPlace = Place & { _id: string; label: string };
type Props = {
  pickup: Place;
  pickupIsGps: boolean;
  near: { latitude: number; longitude: number };
  rideType: "ride" | "parcel";
  onRideType: (t: "ride" | "parcel") => void;
  onPickup: (p: Place | null) => void; // null = back to GPS
  onDestination: (p: Place) => void;
};

/** "Where to?" first: destination search with saved + recent places, editable pickup. */
export function WhereToPanel({ pickup, pickupIsGps, near, rideType, onRideType, onPickup, onDestination }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const [editing, setEditing] = useState<"destination" | "pickup">("destination");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [recent, setRecent] = useState<Place[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    placesApi.list().then((res) => { setSaved(res.data.data.saved); setRecent(res.data.data.recent); }).catch(() => {});
  }, []);

  useEffect(() => {
    const q = query.trim();
    const id = ++seq.current;
    if (q.length < 3) { setResults([]); setBusy(false); setError(""); return; }
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await mapsApi.search(q, near);
        if (id === seq.current) { setResults(res.data.data); setError(res.data.data.length ? "" : "No places found. Try another name, or tap the map."); }
      } catch (e: any) {
        if (id === seq.current) setError(e?.response?.data?.message || "Search is unavailable. Tap the map instead.");
      } finally {
        if (id === seq.current) setBusy(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const choose = (place: Place) => {
    seq.current++;
    setQuery("");
    setResults([]);
    if (editing === "pickup") { onPickup(place); setEditing("destination"); }
    else onDestination(place);
  };

  const shortcut = (label: string) => saved.find((p) => p.label.toLowerCase() === label.toLowerCase());

  return (
    <View style={s.panel}>
      <View style={[s.row, { gap: 8 }]}>
        {(["ride", "parcel"] as const).map((mode) => (
          <TouchableOpacity key={mode} accessibilityRole="radio" accessibilityState={{ selected: rideType === mode }} onPress={() => onRideType(mode)} style={[s.chip, rideType === mode && s.chipActive]}>
            <Feather name={mode === "ride" ? "navigation" : "package"} size={15} color={rideType === mode ? colors.primary : colors.textSecondary} />
            <Text style={s.chipText}>{t(mode === "ride" ? "trip.ride_mode" : "trip.parcel_mode")}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.title}>{t("trip.where_to")}</Text>

      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("trip.change_pickup")} onPress={() => setEditing(editing === "pickup" ? "destination" : "pickup")} style={[s.card, s.row]}>
        <View style={[s.iconBubble, { backgroundColor: `${colors.success}22` }]}><Feather name="circle" size={14} color={colors.success} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.subtitle}>{t("trip.from")}</Text>
          <Text style={s.body} numberOfLines={1}>{pickupIsGps ? `${t("trip.current_location")} · ${pickup.name}` : pickup.name}</Text>
        </View>
        <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{editing === "pickup" ? t("trip.cancel") : t("trip.change_pickup")}</Text>
      </TouchableOpacity>
      {editing === "pickup" && !pickupIsGps ? (
        <TouchableOpacity onPress={() => { onPickup(null); setEditing("destination"); }} style={s.row}><Feather name="crosshair" size={16} color={colors.primary} /><Text style={{ color: colors.primary }}>{t("trip.current_location")}</Text></TouchableOpacity>
      ) : null}

      <View style={s.inputBox}>
        <Feather name="search" size={18} color={colors.primary} />
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t(editing === "pickup" ? "trip.search_pickup" : "trip.search_destination")}
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
          accessibilityLabel={t(editing === "pickup" ? "trip.search_pickup" : "trip.search_destination")}
        />
        {busy ? <ActivityIndicator size="small" color={colors.primary} /> : query ? (
          <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setQuery("")}><Feather name="x" size={18} color={colors.textSecondary} /></TouchableOpacity>
        ) : null}
      </View>
      <Text style={s.subtitle}>{t("trip.tap_map_hint")}</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}

      {results.map((place, i) => (
        <TouchableOpacity key={`${place.latitude},${place.longitude},${i}`} style={s.listItem} onPress={() => choose(place)} accessibilityRole="button">
          <View style={s.iconBubble}><Feather name="map-pin" size={16} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.body} numberOfLines={1}>{place.name}</Text>
            {place.address ? <Text style={s.subtitle} numberOfLines={1}>{place.address}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}

      {!query && editing === "destination" ? (
        <>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {(["Home", "Work"] as const).map((label) => {
              const place = shortcut(label);
              return (
                <TouchableOpacity key={label} disabled={!place} onPress={() => place && choose(place)} style={[s.chip, !place && { opacity: 0.5 }]} accessibilityHint={place ? undefined : "Save this place from the ride summary to use it here"}>
                  <Feather name={label === "Home" ? "home" : "briefcase"} size={15} color={colors.primary} />
                  <Text style={s.chipText}>{t(label === "Home" ? "trip.home" : "trip.work")}</Text>
                </TouchableOpacity>
              );
            })}
            {saved.filter((p) => !["home", "work"].includes(p.label.toLowerCase())).map((p) => (
              <TouchableOpacity key={p._id} onPress={() => choose(p)} style={s.chip}><Feather name="star" size={15} color={colors.primary} /><Text style={s.chipText}>{p.label}</Text></TouchableOpacity>
            ))}
          </View>
          {recent.length ? <Text style={s.label}>{t("trip.recent")}</Text> : null}
          {recent.map((place, i) => (
            <TouchableOpacity key={`recent-${i}`} style={s.listItem} onPress={() => choose(place)}>
              <View style={s.iconBubble}><Feather name="clock" size={16} color={colors.primary} /></View>
              <Text style={[s.body, { flex: 1 }]} numberOfLines={1}>{place.name}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </View>
  );
}
