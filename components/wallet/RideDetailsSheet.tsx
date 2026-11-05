import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { useWideLayout } from "@/hooks/useWideLayout";
import { isCredit, placeName, type RideEntry, type RideRecord, type WalletTx } from "@/utils/walletLedger";

type Props = {
  /** A ride from the wallet (with its ledger rows) or from the driver's ride log. */
  entry?: RideEntry | null;
  ride?: RideRecord | null;
  /** Any other wallet transaction. */
  tx?: WalletTx | null;
  passenger: boolean;
  onClose: () => void;
};

const rwf = (n: number) => `${Math.round(n).toLocaleString()} RWF`;
const when = (d?: string) => (d ? new Date(d).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const words = (v?: string) => (v ? v.replaceAll("_", " ") : "—");

export function RideDetailsSheet({ entry, ride: rideProp, tx, passenger, onClose }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { wide } = useWideLayout();
  const s = styles(colors);
  const ride = entry?.ride ?? rideProp ?? null;
  const visible = Boolean(entry || rideProp || tx);

  const method = (entry?.method || ride?.paymentMethod || "").toLowerCase();
  const methodLabel = method === "cash" ? t("ride_log.cash") : method === "momo" ? t("ride_log.momo") : method === "wallet" ? t("ride_log.wallet") : words(method);
  const fare = entry?.fare ?? Number(ride?.fare ?? ride?.offeredFare ?? 0);
  const commission = entry ? entry.commission : Number(ride?.commissionAmount || 0);
  const tip = entry?.tip ?? Number(ride?.tipAmount || 0);
  const distance = ride?.actualDistanceKm ?? ride?.distance ?? ride?.estimatedDistanceKm;
  const duration = ride?.actualDurationMin ?? ride?.estimatedDurationMin;
  const driverName = ride && typeof ride.driverId === "object" ? [ride.driverId?.firstName, ride.driverId?.lastName].filter(Boolean).join(" ") : "";

  const Row = ({ label, value, color, bold }: { label: string; value?: string | number | null; color?: string; bold?: boolean }) =>
    value === undefined || value === null || value === "" ? null : (
      <View style={s.row}>
        <Text style={s.label}>{label}</Text>
        <Text style={[s.value, bold && s.bold, color ? { color } : null]} selectable>{String(value)}</Text>
      </View>
    );

  const isRide = Boolean(entry || rideProp);
  return (
    <Modal visible={visible} transparent animationType={wide ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={[s.overlay, wide && s.overlayWide]}>
        <TouchableOpacity accessibilityLabel={t("ride_log.close")} style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, wide && s.dialog, { paddingBottom: wide ? 24 : insets.bottom + 20 }]}>
          {!wide ? <View style={s.handle} /> : null}
          <View style={s.header}>
            <Text style={s.title}>{isRide ? t("ride_log.details") : t("ride_log.tx_details")}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("ride_log.close")} onPress={onClose} style={s.close}>
              <Feather name="x" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
            {isRide ? (
              <>
                <View style={s.hero}>
                  <Text style={[s.heroAmount, { color: passenger ? colors.textPrimary : colors.success }]}>
                    {passenger ? "" : "+"}{rwf(fare)}
                  </Text>
                  <Text style={s.heroSub}>{passenger ? t("ride_log.ride_paid") : t("ride_log.ride_payment")} · {methodLabel}</Text>
                </View>

                {ride ? (
                  <View style={s.route}>
                    <View style={s.routeLine}>
                      <View style={[s.dot, { backgroundColor: colors.success }]} />
                      <View style={[s.bar, { backgroundColor: colors.border }]} />
                      <View style={[s.dot, { backgroundColor: colors.primary }]} />
                    </View>
                    <View style={{ flex: 1, gap: 14 }}>
                      <View><Text style={s.label}>{t("ride_log.pickup")}</Text><Text style={s.place}>{placeName(ride.pickup, ride.pickupLocation) || "—"}</Text></View>
                      <View><Text style={s.label}>{t("ride_log.dropoff")}</Text><Text style={s.place}>{placeName(ride.destination, ride.dropoffLocation) || "—"}</Text></View>
                    </View>
                  </View>
                ) : null}

                <View style={s.card}>
                  <Row label={t("ride_log.date")} value={when(ride?.completedAt || ride?.createdAt || entry?.createdAt)} />
                  <Row label={t("ride_log.status")} value={ride ? words(ride.rideStatus || ride.status) : undefined} />
                  <Row label={t("ride_log.payment")} value={methodLabel} />
                  <Row label={t("ride_log.payment_status")} value={ride?.paymentStatus ? words(ride.paymentStatus) : undefined} />
                  <Row label={t("ride_log.vehicle")} value={ride?.vehicleType ? t(ride.vehicleType === "car" ? "ride_log.car" : "ride_log.moto") : undefined} />
                  <Row label={t("ride_log.distance")} value={distance ? `${Number(distance).toFixed(1)} km` : undefined} />
                  <Row label={t("ride_log.duration")} value={duration ? t("ride_log.minutes", { min: String(Math.round(duration)) }) : undefined} />
                  {!passenger ? <Row label={t("ride_log.passenger")} value={ride?.passengerPhone} /> : <Row label={t("ride_log.driver")} value={driverName} />}
                </View>

                <View style={s.card}>
                  <Row label={t("ride_log.fare")} value={rwf(fare)} bold />
                  {!passenger && commission > 0 ? (
                    <Row label={t("ride_log.commission")} value={`-${rwf(commission)}${entry?.commissionOwed ? ` · ${t("drive.tx_owed")}` : ""}`} color={colors.error} />
                  ) : null}
                  {tip > 0 ? <Row label={t("ride_log.tip")} value={`${passenger ? "-" : "+"}${rwf(tip)}`} color={passenger ? colors.error : colors.success} /> : null}
                  {!passenger ? <Row label={t("ride_log.you_keep")} value={rwf(fare - commission + tip)} bold color={colors.success} /> : null}
                </View>
                {!passenger && method === "cash" ? <Text style={s.note}>{t("ride_log.cash_note")}</Text> : null}

                {entry?.rows.length ? (
                  <>
                    <Text style={s.section}>{t("ride_log.ledger")}</Text>
                    <View style={s.card}>
                      {entry.rows.map((r, i) => (
                        <View key={r._id || r.id || i} style={s.ledgerRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.value} numberOfLines={2}>{r.description || words(r.type)}</Text>
                            <Text style={s.label}>{words(r.type)} · {r.status === "pending" && r.type === "platform_commission" ? t("drive.tx_owed") : words(r.status)}</Text>
                          </View>
                          <Text style={[s.bold, { color: isCredit(r) ? colors.success : colors.error }]}>{isCredit(r) ? "+" : "-"}{Math.abs(Number(r.amount || 0)).toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
                <Row label={t("ride_log.ride_id")} value={entry?.rideId || ride?._id || ride?.id} />
              </>
            ) : tx ? (
              <>
                <View style={s.hero}>
                  <Text style={[s.heroAmount, { color: isCredit(tx) ? colors.success : colors.error }]}>{isCredit(tx) ? "+" : "-"}{rwf(Math.abs(Number(tx.amount || 0)))}</Text>
                  <Text style={s.heroSub}>{tx.description || words(tx.type)}</Text>
                </View>
                <View style={s.card}>
                  <Row label={t("ride_log.type")} value={words(tx.type)} />
                  <Row label={t("ride_log.payment_status")} value={words(tx.status)} />
                  <Row label={t("ride_log.date")} value={when(tx.createdAt)} />
                  <Row label={t("ride_log.commission")} value={tx.feeAmount ? rwf(tx.feeAmount) : undefined} />
                  <Row label={t("ride_log.reference")} value={tx.paypackRef || tx.reference || tx._id || tx.id} />
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  overlayWide: { justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { backgroundColor: c.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: "88%" },
  dialog: { width: "100%", maxWidth: 520, borderRadius: 24, paddingTop: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.textPrimary },
  close: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  hero: { alignItems: "center", paddingVertical: 14 },
  heroAmount: { fontSize: 30, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.textSecondary, marginTop: 4, textAlign: "center" },
  route: { flexDirection: "row", gap: 12, backgroundColor: c.backgroundElevated, borderRadius: 16, padding: 14, marginBottom: 12 },
  routeLine: { alignItems: "center", paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bar: { width: 2, flex: 1, marginVertical: 4 },
  place: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.textPrimary, marginTop: 2 },
  card: { backgroundColor: c.backgroundElevated, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 10 },
  ledgerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.textSecondary, textTransform: "capitalize" },
  value: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.textPrimary, textAlign: "right", flexShrink: 1 },
  bold: { fontFamily: "Inter_700Bold" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 12, lineHeight: 18 },
  section: { fontSize: 13, fontFamily: "Inter_700Bold", color: c.textPrimary, marginBottom: 8 },
});
