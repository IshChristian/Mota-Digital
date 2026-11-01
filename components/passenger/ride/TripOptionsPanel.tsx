import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import type { FareOption, ParcelDetails, PaymentMethod, RouteResult, VehicleType } from "@/services/api";
import { DirectionsList } from "./DirectionsList";
import { RwandaPhoneInput } from "@/components/RwandaPhoneInput";
import { rideStyles } from "./rideStyles";

export type TripChoice = {
  vehicleType: VehicleType;
  offer: number;
  passengers: number;
  paymentMethod: PaymentMethod;
  scheduledAt: Date | null;
  parcel?: ParcelDetails;
};

type Props = {
  route?: RouteResult | null;
  destinationName: string;
  rideType: "ride" | "parcel";
  options: FareOption[] | null;
  optionsError: string;
  walletBalance: number | null;
  preferredPayment?: PaymentMethod;
  submitting: boolean;
  momoAvailable: boolean;
  onBack: () => void;
  onSubmit: (choice: TripChoice) => void;
};

const MAX_PASSENGERS: Record<VehicleType, number> = { motor: 1, car: 4 };
const STEP = 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const rwf = (n: number) => `${Math.round(n).toLocaleString()} RWF`;

export function TripOptionsPanel({ route, destinationName, rideType, options, optionsError, walletBalance, preferredPayment = "cash", submitting, momoAvailable, onBack, onSubmit }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const s = rideStyles(colors);
  const [vehicleType, setVehicleType] = useState<VehicleType>("motor");
  const option = options?.find((o) => o.vehicleType === vehicleType);
  const [offer, setOffer] = useState(0);
  const [offerText, setOfferText] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [payment, setPayment] = useState<PaymentMethod>(preferredPayment);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 60 * 60_000));
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [parcel, setParcel] = useState<ParcelDetails>({ recipientName: "", recipientPhone: "", description: "", size: "small" });
  const [error, setError] = useState("");

  // New quote or vehicle → start at the suggested fare.
  useEffect(() => {
    if (!option) return;
    setOffer(option.suggestedFare);
    setOfferText(String(option.suggestedFare));
  }, [option?.suggestedFare, vehicleType]);
  useEffect(() => { setPassengers((p) => clamp(p, 1, MAX_PASSENGERS[vehicleType])); }, [vehicleType]);
  useEffect(() => { if (vehicleType === "motor" && parcel.size === "large") setParcel((p) => ({ ...p, size: "medium" })); }, [vehicleType]);

  const commitOfferText = () => {
    if (!option) return;
    const typed = Number.parseInt(offerText.replace(/\D/g, ""), 10);
    const next = clamp(Number.isFinite(typed) ? Math.round(typed / STEP) * STEP : option.suggestedFare, option.minimumFare, option.maximumFare);
    setOffer(next);
    setOfferText(String(next));
  };
  const step = (delta: number) => {
    if (!option) return;
    const next = clamp(offer + delta, option.minimumFare, option.maximumFare);
    setOffer(next);
    setOfferText(String(next));
  };

  const submit = () => {
    setError("");
    if (!option) return;
    if (payment === "wallet" && walletBalance != null && walletBalance < offer) {
      setError(`Your wallet has ${rwf(walletBalance)}. Top up, or pay with cash or mobile money.`);
      return;
    }
    if (scheduled && scheduledAt.getTime() < Date.now() + 20 * 60_000) { setError("Schedule at least 20 minutes ahead."); return; }
    if (rideType === "parcel" && (!parcel.recipientName.trim() || !parcel.recipientPhone)) { setError("Add the recipient's name and phone number."); return; }
    onSubmit({ vehicleType, offer, passengers, paymentMethod: payment, scheduledAt: scheduled ? scheduledAt : null, parcel: rideType === "parcel" ? parcel : undefined });
  };

  return (
    <View style={s.panel}>
      <View style={s.row}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to destination" onPress={onBack} style={s.stepBtn}><Feather name="arrow-left" size={20} color={colors.textPrimary} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.subtitle}>{rideType === "parcel" ? t("trip.send_parcel") : t("trip.choose_option")}</Text>
          <Text style={s.title} numberOfLines={1}>{destinationName}</Text>
        </View>
      </View>

      {!options && !optionsError ? <ActivityIndicator color={colors.primary} style={{ padding: 24 }} /> : null}
      {optionsError ? <Text style={s.error}>{optionsError}</Text> : null}

      {options?.map((o) => {
        const selected = o.vehicleType === vehicleType;
        return (
          <TouchableOpacity key={o.vehicleType} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setVehicleType(o.vehicleType)} style={[s.card, s.row, selected && { borderColor: colors.primary, borderWidth: 2 }]}>
            <View style={s.iconBubble}><Feather name={o.vehicleType === "car" ? "truck" : "navigation"} size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.body}>{t(o.vehicleType === "car" ? "trip.car" : "trip.moto")}</Text>
              <Text style={s.subtitle}>{t(o.vehicleType === "car" ? "trip.car_desc" : "trip.moto_desc")} · {o.distanceKm} km · {t("trip.min_away", { min: String(o.durationMinutes) })}</Text>
            </View>
            <Text style={[s.body, { fontFamily: "Inter_700Bold" }]}>{rwf(o.suggestedFare)}</Text>
          </TouchableOpacity>
        );
      })}
      {option?.routeSource === "estimate" ? <Text style={s.subtitle}>{t("trip.estimate_note")}</Text> : null}
      {route ? <DirectionsList route={route} /> : null}

      {option ? (
        <View style={s.card}>
          <Text style={s.label}>{t("trip.your_offer")}</Text>
          <View style={[s.row, { justifyContent: "space-between", marginTop: 8 }]}>
            <TouchableOpacity accessibilityLabel="Lower offer by 100" disabled={offer <= option.minimumFare} onPress={() => step(-STEP)} style={[s.stepBtn, offer <= option.minimumFare && { opacity: 0.4 }]}><Feather name="minus" size={20} color={colors.primary} /></TouchableOpacity>
            <View style={s.row}>
              <TextInput accessibilityLabel={t("trip.your_offer")} value={offerText} onChangeText={setOfferText} onBlur={commitOfferText} onSubmitEditing={commitOfferText} keyboardType="number-pad" style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: colors.textPrimary, minWidth: 90, textAlign: "center" }} />
              <Text style={s.subtitle}>RWF</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Raise offer by 100" disabled={offer >= option.maximumFare} onPress={() => step(STEP)} style={[s.stepBtn, offer >= option.maximumFare && { opacity: 0.4 }]}><Feather name="plus" size={20} color={colors.primary} /></TouchableOpacity>
          </View>
          <Text style={[s.subtitle, { textAlign: "center", marginTop: 6 }]}>{t("trip.fare_range", { min: option.minimumFare.toLocaleString(), max: option.maximumFare.toLocaleString() })}</Text>
        </View>
      ) : null}

      {rideType === "ride" && vehicleType === "car" ? (
        <View style={[s.card, s.row, { justifyContent: "space-between" }]}>
          <Text style={s.body}>{t("trip.passengers")}</Text>
          <View style={s.row}>
            <TouchableOpacity accessibilityLabel="Fewer passengers" disabled={passengers <= 1} onPress={() => setPassengers(passengers - 1)} style={[s.stepBtn, passengers <= 1 && { opacity: 0.4 }]}><Feather name="minus" size={18} color={colors.primary} /></TouchableOpacity>
            <Text style={[s.body, { minWidth: 24, textAlign: "center" }]}>{passengers}</Text>
            <TouchableOpacity accessibilityLabel="More passengers" disabled={passengers >= MAX_PASSENGERS.car} onPress={() => setPassengers(passengers + 1)} style={[s.stepBtn, passengers >= MAX_PASSENGERS.car && { opacity: 0.4 }]}><Feather name="plus" size={18} color={colors.primary} /></TouchableOpacity>
          </View>
        </View>
      ) : null}

      {rideType === "parcel" ? (
        <View style={[s.card, { gap: 10 }]}>
          <View style={s.inputBox}><TextInput style={s.input} value={parcel.recipientName} onChangeText={(v) => setParcel({ ...parcel, recipientName: v })} placeholder={t("trip.recipient_name")} placeholderTextColor={colors.textTertiary} /></View>
          <RwandaPhoneInput value={parcel.recipientPhone} onChangeText={(v: string) => setParcel({ ...parcel, recipientPhone: v })} accessibilityLabel={t("trip.recipient_phone")} />
          <View style={s.inputBox}><TextInput style={s.input} value={parcel.description} maxLength={200} onChangeText={(v) => setParcel({ ...parcel, description: v })} placeholder={t("trip.parcel_desc")} placeholderTextColor={colors.textTertiary} /></View>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {(["small", "medium", "large"] as const).map((size) => {
              const disabled = size === "large" && vehicleType === "motor";
              return <TouchableOpacity key={size} disabled={disabled} onPress={() => setParcel({ ...parcel, size })} style={[s.chip, parcel.size === size && s.chipActive, disabled && { opacity: 0.4 }]}><Text style={s.chipText}>{t(`trip.${size}`)}</Text></TouchableOpacity>;
            })}
          </View>
          <Text style={s.subtitle}>{t("trip.parcel_code_note")}</Text>
        </View>
      ) : null}

      <Text style={s.label}>{t("trip.payment")}</Text>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {(["cash", "momo", "wallet"] as const).map((m) => (
          <TouchableOpacity key={m} accessibilityRole="radio" accessibilityState={{ selected: payment === m, disabled: m === "momo" && !momoAvailable }} disabled={m === "momo" && !momoAvailable} onPress={() => setPayment(m)} style={[s.chip, payment === m && s.chipActive, m === "momo" && !momoAvailable && { opacity: 0.4 }]}>
            <Feather name={m === "cash" ? "dollar-sign" : m === "momo" ? "smartphone" : "credit-card"} size={15} color={payment === m ? colors.primary : colors.textSecondary} />
            <Text style={s.chipText}>{t(`trip.${m}`)}{m === "wallet" && walletBalance != null ? ` · ${walletBalance.toLocaleString()}` : ""}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!momoAvailable ? <Text style={s.subtitle}>Mobile money for rides is coming soon. Top up your wallet with MoMo, or pay cash.</Text> : null}
      <View style={[s.row, { flexWrap: "wrap" }]}>
        <TouchableOpacity onPress={() => setScheduled(false)} style={[s.chip, !scheduled && s.chipActive]}><Text style={s.chipText}>{t("trip.now")}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setScheduled(true)} style={[s.chip, scheduled && s.chipActive]}><Feather name="clock" size={15} color={colors.primary} /><Text style={s.chipText}>{t("trip.schedule")}</Text></TouchableOpacity>
        {scheduled ? (
          <>
            <TouchableOpacity onPress={() => setPicker("date")} style={s.chip}><Text style={s.chipText}>{scheduledAt.toLocaleDateString()}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setPicker("time")} style={s.chip}><Text style={s.chipText}>{scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></TouchableOpacity>
          </>
        ) : null}
      </View>
      {picker ? (
        <DateTimePicker
          value={scheduledAt}
          mode={picker}
          minimumDate={new Date()}
          maximumDate={new Date(Date.now() + 7 * 24 * 60 * 60_000)}
          minuteInterval={5}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onValueChange={(_e: unknown, value?: Date) => { setPicker(null); if (value) setScheduledAt(value); }}
          onDismiss={() => setPicker(null)}
        />
      ) : null}

      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <TouchableOpacity accessibilityRole="button" disabled={!option || submitting} onPress={submit} style={[s.primaryBtn, (!option || submitting) && { opacity: 0.6 }]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{t(rideType === "parcel" ? "trip.request_parcel" : "trip.request")}{option ? ` · ${rwf(offer)}` : ""}</Text>}
      </TouchableOpacity>
    </View>
  );
}
