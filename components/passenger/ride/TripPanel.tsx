import { useState } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { callNumber, shareMessage } from "@/utils/share";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { Alert } from "@/components/GlobalAlert";
import { ridesApi, getApiErrorMessage } from "@/services/api";
import type { RideView } from "@/hooks/usePassengerRide";
import { haversineKm } from "@/utils/geo";
import { rideStyles } from "./rideStyles";

type Props = { ride: RideView; momoAvailable: boolean; onChanged: () => void; onCancel: () => void; onSos: () => void };

const STEPS: Array<[string, string[]]> = [
  ["Driver accepted", ["approaching", "accepted", "arrived", "start_requested", "in_progress", "stop_requested", "awaiting_payment"]],
  ["At pickup", ["arrived", "start_requested", "in_progress", "stop_requested", "awaiting_payment"]],
  ["On the way", ["in_progress", "stop_requested", "awaiting_payment"]],
  ["Arrived", ["awaiting_payment"]],
];

export function TripPanel({ ride, momoAvailable, onChanged, onCancel, onSos }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const d = ride.driver;
  const status = ride.rideStatus;
  const preStart = ["accepted", "approaching", "arrived", "start_requested"].includes(status);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); onChanged(); }
    catch (e) { Alert.alert("Couldn't complete that", getApiErrorMessage(e)); }
    finally { setBusy(null); }
  };

  const etaMin = (() => {
    if (!d?.lastLocation || !["approaching", "accepted"].includes(status)) return null;
    const km = haversineKm(d.lastLocation, ride.pickup) * 1.3;
    return Math.max(1, Math.round((km / (ride.vehicleType === "car" ? 20 : 25)) * 60));
  })();
  const locationFresh = d?.lastLocationAt ? Date.now() - Date.parse(d.lastLocationAt) < 60_000 : false;

  const headline = status === "arrived" || status === "start_requested" ? t("trip.driver_arrived")
    : status === "in_progress" ? t("trip.in_progress")
    : status === "stop_requested" ? t("trip.arriving")
    : status === "awaiting_payment" ? t("trip.payment")
    : t("trip.driver_coming");

  const call = () => act("call", async () => {
    const res = await ridesApi.call(ride._id);
    if (res.data.data.mode === "direct" && res.data.data.phone) await callNumber(res.data.data.phone);
    else Alert.alert("Connecting your call", res.data.data.message || "Answer the incoming MOTA call.");
  });
  const share = () => act("share", async () => {
    const res = await ridesApi.share(ride._id);
    await shareMessage({ message: t("trip.share_message", { url: res.data.data.url }) });
  });

  return (
    <View style={s.panel}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1 }}>
          <Text accessibilityLiveRegion="polite" style={s.title}>{headline}</Text>
          <Text style={s.subtitle}>
            {etaMin ? `${t("trip.min_away", { min: String(etaMin) })} · ` : ""}{ride.destination.name}
            {!locationFresh && preStart ? " · waiting for driver GPS" : ""}
          </Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("trip.sos")} onPress={onSos} style={{ backgroundColor: colors.error, borderRadius: 22, paddingHorizontal: 14, height: 44, justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>{t("trip.sos")}</Text>
        </TouchableOpacity>
      </View>

      {d ? (
        <View style={[s.card, s.row]}>
          {d.avatarUrl ? <Image source={{ uri: d.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} accessibilityIgnoresInvertColors /> : <View style={[s.iconBubble, { width: 56, height: 56, borderRadius: 28 }]}><Feather name="user" size={24} color={colors.primary} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={s.body}>{d.firstName} · ★ {d.rating?.toFixed(1) ?? "—"} <Text style={s.subtitle}>({d.totalRides ?? 0} trips)</Text></Text>
            <Text style={s.subtitle}>{[d.vehicleColor, d.vehicleMake].filter(Boolean).join(" ") || (ride.vehicleType === "car" ? t("trip.car") : t("trip.moto"))}</Text>
          </View>
          <View style={{ backgroundColor: colors.textPrimary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text accessibilityLabel={`Plate ${d.plate}`} style={{ color: colors.background, fontFamily: "Inter_700Bold", letterSpacing: 1 }}>{d.plate || "—"}</Text>
          </View>
        </View>
      ) : null}

      {preStart && ride.ridePin ? (
        <View style={[s.card, s.row, { justifyContent: "space-between" }]}>
          <View style={{ flex: 1 }}><Text style={s.label}>{t("trip.trip_pin")}</Text><Text style={s.subtitle}>{t("trip.pin_help")}</Text></View>
          <Text accessibilityLabel={`PIN ${ride.ridePin.split("").join(" ")}`} style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: colors.textPrimary, letterSpacing: 6 }}>{ride.ridePin}</Text>
        </View>
      ) : null}

      <View style={s.row}>
        {[
          { key: "call", icon: "phone" as const, label: t("trip.call"), onPress: call },
          { key: "chat", icon: "message-circle" as const, label: t("trip.chat"), onPress: () => router.push({ pathname: "/ride-chat/[id]", params: { id: ride._id, name: d?.firstName || "" } } as any) },
          { key: "share", icon: "share-2" as const, label: t("trip.share"), onPress: share },
        ].map((a) => (
          <TouchableOpacity key={a.key} accessibilityRole="button" accessibilityLabel={a.label} disabled={!!busy} onPress={a.onPress} style={[s.secondaryBtn, { flex: 1, flexDirection: "column", gap: 4, paddingVertical: 8 }]}>
            {busy === a.key ? <ActivityIndicator color={colors.primary} /> : <Feather name={a.icon} size={18} color={colors.primary} />}
            <Text style={[s.subtitle, { color: colors.textPrimary }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.row, { gap: 6 }]}>
        {STEPS.map(([label, states]) => {
          const done = states.includes(status);
          return <View key={label} style={{ flex: 1, gap: 4 }}><View style={{ height: 4, borderRadius: 2, backgroundColor: done ? colors.primary : colors.border }} /><Text style={[s.subtitle, { fontSize: 11 }, done && { color: colors.textPrimary }]}>{label}</Text></View>;
        })}
      </View>

      {status === "start_requested" ? (
        <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => act("start", () => ridesApi.confirmStart(ride._id))} style={s.primaryBtn}>
          {busy === "start" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("trip.confirm_start")}</Text>}
        </TouchableOpacity>
      ) : null}
      {status === "stop_requested" ? (
        <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => act("stop", () => ridesApi.confirmStop(ride._id))} style={s.primaryBtn}>
          {busy === "stop" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("trip.confirm_arrival")}</Text>}
        </TouchableOpacity>
      ) : null}
      {status === "awaiting_payment" ? (
        ride.paymentStatus === "successful" ? (
          <View style={[s.card, s.row]}><Feather name="check-circle" size={18} color={colors.success} /><Text style={[s.body, { flex: 1 }]}>Payment received. Your driver is finishing the trip.</Text></View>
        ) : ride.paymentMethod === "cash" ? (
          <View style={s.card}><Text style={s.body}>{t("trip.pay_cash", { amount: ride.fare.toLocaleString() })}</Text></View>
        ) : ride.paymentMethod === "momo" && momoAvailable ? (
          <TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => act("pay", () => ridesApi.payRide(ride._id))} style={s.primaryBtn}>
            {busy === "pay" ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t("trip.pay_now", { amount: ride.fare.toLocaleString() })} · MoMo</Text>}
          </TouchableOpacity>
        ) : (
          <View style={s.card}><Text style={s.body}>{ride.paymentMethod === "wallet" ? "Your wallet payment didn't go through. Top up your wallet, or pay the driver in cash." : t("trip.pay_cash", { amount: ride.fare.toLocaleString() })}</Text></View>
        )
      ) : null}

      {preStart && status !== "start_requested" ? (
        <TouchableOpacity accessibilityRole="button" onPress={onCancel} style={s.secondaryBtn}><Text style={s.secondaryText}>{t("trip.cancel")}</Text></TouchableOpacity>
      ) : null}
    </View>
  );
}
