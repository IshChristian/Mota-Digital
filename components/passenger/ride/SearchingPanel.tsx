import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { ridesApi, getApiErrorMessage } from "@/services/api";
import type { CounterOfferEvent, RideView } from "@/hooks/usePassengerRide";
import { rideStyles } from "./rideStyles";

type Props = {
  ride: RideView;
  notifiedDrivers: number | null;
  offers: CounterOfferEvent[];
  onNotified: (n: number) => void;
  onDismissOffer: (offerId: string) => void;
  onChanged: () => void;
  onCancel: () => void;
};

export function SearchingPanel({ ride, notifiedDrivers, offers, onNotified, onDismissOffer, onChanged, onCancel }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const max = ride.maximumFare ?? ride.fare;

  useEffect(() => {
    const started = ride.requestedAt ? Date.parse(ride.requestedAt) : Date.now();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [ride._id]);

  const raise = async (by: number) => {
    setBusy(`raise${by}`); setError("");
    try {
      const res = await ridesApi.raiseOffer(ride._id, Math.min(max, ride.fare + by));
      onNotified(res.data?.data?.notifiedDrivers ?? 0);
      onChanged();
    } catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(null); }
  };
  const accept = async (offer: CounterOfferEvent) => {
    setBusy(offer.offerId); setError("");
    try { await ridesApi.acceptCounterOffer(ride._id, offer.offerId); onChanged(); }
    catch (e) { setError(getApiErrorMessage(e)); onDismissOffer(offer.offerId); } finally { setBusy(null); }
  };

  const mm = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  return (
    <View style={s.panel}>
      <View style={s.row}>
        <ActivityIndicator color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("trip.finding")}</Text>
          <Text accessibilityLiveRegion="polite" style={s.subtitle}>{notifiedDrivers ? t("trip.notified", { count: String(notifiedDrivers) }) : t("trip.no_drivers_yet")} · {mm}</Text>
        </View>
        <Text style={[s.body, { fontFamily: "Inter_700Bold" }]}>{ride.fare.toLocaleString()} RWF</Text>
      </View>

      {offers.length ? <Text style={s.label}>{t("trip.offers_from_drivers")}</Text> : null}
      {offers.map((o) => (
        <View key={o.offerId} style={[s.card, s.row]}>
          <View style={{ flex: 1 }}>
            <Text style={s.body}>{o.driver.firstName} · ★ {o.driver.rating?.toFixed(1) ?? "—"}</Text>
            <Text style={s.subtitle}>{o.driver.plate} {o.driver.distanceKm != null ? `· ${o.driver.distanceKm} km away` : ""}</Text>
          </View>
          <Text style={[s.body, { fontFamily: "Inter_700Bold" }]}>{o.amount.toLocaleString()}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => accept(o)} style={[s.primaryBtn, { minHeight: 40, paddingHorizontal: 14 }]}>
            {busy === o.offerId ? <ActivityIndicator color="#fff" /> : <Text style={[s.primaryText, { fontSize: 14 }]}>{t("trip.accept_offer")}</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Dismiss offer" onPress={() => onDismissOffer(o.offerId)}><Feather name="x" size={18} color={colors.textSecondary} /></TouchableOpacity>
        </View>
      ))}

      {ride.fare < max ? (
        <View style={s.card}>
          <Text style={s.subtitle}>{t("trip.raise_offer")}</Text>
          <View style={[s.row, { marginTop: 10 }]}>
            {[100, 200, 500].filter((by) => ride.fare + by <= max || by === 100).map((by) => (
              <TouchableOpacity key={by} disabled={!!busy} onPress={() => raise(by)} style={[s.chip, { flex: 1 }]}>
                {busy === `raise${by}` ? <ActivityIndicator color={colors.primary} /> : <Text style={s.chipText}>+{Math.min(by, max - ride.fare)}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <TouchableOpacity accessibilityRole="button" onPress={onCancel} style={s.secondaryBtn}><Text style={s.secondaryText}>{t("trip.cancel_request")}</Text></TouchableOpacity>
    </View>
  );
}
