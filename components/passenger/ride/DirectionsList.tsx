import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import type { RouteResult } from "@/services/api";
import { rideStyles } from "./rideStyles";

const fmt = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`);
const icon = (maneuver: string): React.ComponentProps<typeof Feather>["name"] => {
  const m = maneuver.toLowerCase();
  if (m.includes("left")) return "corner-up-left";
  if (m.includes("right")) return "corner-up-right";
  if (m.includes("roundabout") || m.includes("rotary")) return "rotate-cw";
  if (m.includes("arrive")) return "flag";
  return "arrow-up";
};

/** Collapsible turn-by-turn list for a route, with its source (Google or OpenStreetMap). */
export function DirectionsList({ route, initiallyOpen = false }: { route: RouteResult; initiallyOpen?: boolean }) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const [open, setOpen] = useState(initiallyOpen);
  if (!route.steps?.length) return null;
  return (
    <View style={s.card}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={[s.row, { justifyContent: "space-between" }]}>
        <View style={s.row}>
          <Feather name="navigation" size={16} color={colors.primary} />
          <Text style={s.body}>{t("trip.directions")} · {fmt(route.distanceMeters)} · {Math.max(1, Math.round(route.durationSeconds / 60))} min</Text>
        </View>
        <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{open ? t("trip.hide_directions") : t("trip.show_directions")}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={{ marginTop: 8 }}>
          {route.steps.map((step, i) => (
            <View key={i} style={[s.row, { paddingVertical: 8, alignItems: "flex-start" }]}>
              <Feather name={icon(step.maneuver)} size={16} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={[s.body, { flex: 1, fontSize: 14 }]}>{step.instruction}</Text>
              {step.distanceMeters ? <Text style={s.subtitle}>{fmt(step.distanceMeters)}</Text> : null}
            </View>
          ))}
          <Text style={[s.subtitle, { fontSize: 11 }]}>{t("trip.route_by", { source: route.source === "google" ? "Google" : "OpenStreetMap" })}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function NextTurn({ route }: { route: RouteResult }) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const step = route.steps?.find((x) => x.distanceMeters > 0 && !/^start/i.test(x.instruction)) ?? route.steps?.[0];
  if (!step) return null;
  return (
    <View style={[s.card, s.row]} accessibilityLiveRegion="polite">
      <Feather name={icon(step.maneuver)} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={s.subtitle}>{t("trip.next_turn")}</Text>
        <Text style={s.body}>{step.instruction}</Text>
      </View>
    </View>
  );
}
