import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { driverApi, ridesApi, getApiErrorMessage } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { Metric, StatusPill } from "@/components/driver/DriverUI";
import { SlideButton } from "@/components/driver/SlideButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RequestRouteMap } from "@/components/driver/RequestRouteMap";
import { useWideLayout } from "@/hooks/useWideLayout";

type RideRequest = {
  id?: string;
  _id?: string;
  pickup?: { address?: string; name?: string; distanceKm?: number; latitude?: number; longitude?: number } | string;
  destination?:
    | { address?: string; name?: string; distanceKm?: number; latitude?: number; longitude?: number }
    | string;
  offeredFare?: number;
  fare?: number;
  driverEarning?: number;
  commissionAmount?: number;
  commissionRate?: number;
  passengers?: number;
  scheduledTime?: string;
  scheduledDate?: string;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  maximumFare?: number;
  /** Price this driver already proposed. */
  counterSent?: number;
  rideType?: "ride" | "parcel";
  vehicleType?: "motor" | "car";
  paymentMethod?: "cash" | "momo" | "wallet";
  parcel?: { size?: string; description?: string };
};

interface RideRequestModalProps {
  request: RideRequest | null;
  /** Position among the open requests (0-based) and how many there are. */
  index?: number;
  total?: number;
  onMove?: (step: 1 | -1) => void;
  /** Put the alert away without answering; the request stays in the Requests tab. */
  onLater: () => void;
  notice?: string;
  onAccept: (id: string) => Promise<void> | void;
  onDecline: (id: string) => Promise<void> | void;
}

function place(value: RideRequest["pickup"], fallback: string) {
  if (typeof value === "string") return value;
  return value?.name || value?.address || fallback;
}

export function RideRequestModal({
  request,
  index = 0,
  total = 1,
  onMove,
  onLater,
  notice,
  onAccept,
  onDecline,
}: RideRequestModalProps) {
  const { colors } = useTheme();
  const t = useT();
  const { wide } = useWideLayout();
  const insets = useSafeAreaInsets();
  const [action, setAction] = useState<"accept" | "decline" | "counter" | null>(null);
  const [counterSent, setCounterSent] = useState<number | null>(null);
  const [counterError, setCounterError] = useState("");

  const receiptId = request?.id || request?._id;
  // Reset only for a different request: a live refresh of the same one keeps "offer sent".
  useEffect(() => { setAction(null); setCounterSent(request?.counterSent ?? null); setCounterError(""); }, [receiptId]);
  useEffect(() => {
    if (receiptId) void driverApi.acknowledgeOffer(receiptId).catch(() => console.warn('Offer receipt could not be recorded.'));
  }, [receiptId]);

  if (!request) return null;
  const rideId = request.id || request._id;
  const pickup = place(request.pickup, t("drive.pickup_location"));
  const destination = place(request.destination, t("drive.destination"));
  const tripDistance =
    request.estimatedDistanceKm ??
    (typeof request.destination === "object"
      ? request.destination?.distanceKm
      : undefined);
  const pickupDistance =
    typeof request.pickup === "object" ? request.pickup?.distanceKm : undefined;
  const scheduled = request.scheduledTime
    ? `${request.scheduledDate || ""} ${request.scheduledTime}`.trim()
    : t("drive.asap");

  const submit = async (next: "accept" | "decline") => {
    if (!rideId || action) return;
    setAction(next);
    try {
      await (next === "accept" ? onAccept(rideId) : onDecline(rideId));
    } finally {
      setAction(null);
    }
  };

  return (
    <Modal visible transparent onRequestClose={() => { if (action !== "accept") onLater(); }} animationType={wide ? "fade" : "slide"} statusBarTranslucent>
      <View style={[styles.overlay, wide && styles.overlayWide]}>
        <View
          style={[styles.sheet, wide && styles.sheetWide, { backgroundColor: colors.backgroundCard }]}
        >
          {wide ? (
            <View style={styles.wideMap}>
              <RequestRouteMap rideId={rideId} pickup={request.pickup} destination={request.destination} height="100%" zoomControls />
            </View>
          ) : <View style={[styles.handle, { backgroundColor: colors.border }]} />}
          <View style={wide ? { flex: 1 } : { flexShrink: 1 }}>
          {total > 1 ? (
            <View style={styles.pager}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("drive.prev_request")} disabled={action !== null || index === 0} onPress={() => onMove?.(-1)} style={[styles.pagerBtn, { backgroundColor: colors.backgroundElevated, opacity: index === 0 ? 0.4 : 1 }]}><Feather name="chevron-left" size={22} color={colors.textPrimary} /></TouchableOpacity>
              <Text accessibilityLiveRegion="polite" style={[styles.pagerText, { color: colors.textPrimary }]}>{t("drive.request_n", { n: String(index + 1), total: String(total) })}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("drive.next_request")} disabled={action !== null || index >= total - 1} onPress={() => onMove?.(1)} style={[styles.pagerBtn, { backgroundColor: colors.backgroundElevated, opacity: index >= total - 1 ? 0.4 : 1 }]}><Feather name="chevron-right" size={22} color={colors.textPrimary} /></TouchableOpacity>
            </View>
          ) : null}
          <ScrollView
            style={[wide ? { flex: 1 } : { flexShrink: 1 }, Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.titleRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <StatusPill label={request.rideType === "parcel" ? t("drive.new_parcel") : t("drive.new_request")} tone="warning" />
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t("drive.review")}</Text>
              </View>
              <View
                style={[
                  styles.bell,
                  { backgroundColor: `${colors.primary}18` },
                ]}
              >
                <Feather name="bell" size={22} color={colors.primary} />
              </View>
            </View>

            {!wide ? <RequestRouteMap rideId={rideId} pickup={request.pickup} destination={request.destination} height={210} /> : null}

            <View
              style={[
                styles.routeCard,
                { backgroundColor: colors.backgroundElevated },
              ]}
            >
              <View style={styles.route}>
                <View style={styles.rail}>
                  <View
                    style={[styles.dot, { backgroundColor: colors.primary }]}
                  />
                  <View
                    style={[styles.line, { backgroundColor: colors.border }]}
                  />
                  <View
                    style={[styles.dot, { backgroundColor: colors.success }]}
                  />
                </View>
                <View style={styles.routeCopy}>
                  <View>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >{t("drive.pickup").toUpperCase()}</Text>
                    <Text style={[styles.place, { color: colors.textPrimary }]}>
                      {pickup}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >{t("drive.destination").toUpperCase()}</Text>
                    <Text style={[styles.place, { color: colors.textPrimary }]}>
                      {destination}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.metrics}>
              <Metric
                label={t("drive.to_pickup_dist")}
                value={
                  pickupDistance === undefined
                    ? "—"
                    : `${pickupDistance.toFixed(1)} km`
                }
                icon="navigation"
              />
              <Metric
                label={t("drive.trip")}
                value={
                  tripDistance === undefined
                    ? "—"
                    : `${Number(tripDistance).toFixed(1)} km`
                }
                icon="map"
              />
              <Metric
                label={t("drive.passengers")}
                value={String(request.passengers || 1)}
                icon="users"
              />
            </View>

            <View style={[styles.schedule, { borderColor: colors.border }]}>
              <Feather name="clock" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t("drive.requested_time").toUpperCase()}</Text>
                <Text
                  style={[styles.scheduleValue, { color: colors.textPrimary }]}
                >
                  {scheduled}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.fareCard,
                {
                  backgroundColor: `${colors.success}16`,
                  borderColor: `${colors.success}35`,
                },
              ]}
            >
              <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>{t("drive.passenger_offer")}</Text>
              <Text style={[styles.fare, { color: colors.success }]}>
                {Number(
                  request.offeredFare ?? request.fare ?? 0,
                ).toLocaleString()}{" "}
                RWF
              </Text>
            </View>

            {typeof request.driverEarning === "number" ? <View style={[styles.routeCard, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>{t("drive.take_home")}</Text>
              <Text style={[styles.fare, { color: colors.success }]}>{request.driverEarning.toLocaleString()} RWF</Text>
              <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>{t("drive.commission_line", { amount: Number(request.commissionAmount || 0).toLocaleString() })}</Text>
              {request.estimatedDurationMin ? <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>{t("drive.trip_time", { min: String(request.estimatedDurationMin) })}</Text> : null}
            </View> : null}
            {request.rideType === "parcel" || request.paymentMethod ? (
              <View style={[styles.schedule, { borderColor: colors.border }]}>
                <Feather name={request.rideType === "parcel" ? "package" : "credit-card"} size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  {request.rideType === "parcel" ? <Text style={[styles.scheduleValue, { color: colors.textPrimary }]}>{t("drive.parcel", { size: request.parcel?.size || "small" })}{request.parcel?.description ? ` · ${request.parcel.description}` : ""}</Text> : null}
                  {request.rideType === "parcel" ? <Text style={[styles.label, { color: colors.textSecondary }]}>{t("drive.recipient_code_note").toUpperCase()}</Text> : null}
                  {request.paymentMethod ? <Text style={[styles.label, { color: colors.textSecondary }]}>{t(request.paymentMethod === "cash" ? "drive.pay_cash" : request.paymentMethod === "momo" ? "drive.pay_momo" : "drive.pay_wallet").toUpperCase()}</Text> : null}
                </View>
              </View>
            ) : null}

            {rideId && request.maximumFare && Number(request.offeredFare ?? 0) < request.maximumFare ? (
              <View style={{ gap: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t("drive.propose").toUpperCase()}</Text>
                {counterSent ? (
                  <Text style={{ color: colors.success }}>{t("drive.offered", { amount: counterSent.toLocaleString() })}</Text>
                ) : (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[200, 500, 1000].map((by) => {
                      const amount = Math.min(request.maximumFare!, Number(request.offeredFare ?? 0) + by);
                      return (
                        <TouchableOpacity key={by} accessibilityRole="button" accessibilityLabel={`Offer ${amount} RWF`} disabled={action !== null} onPress={async () => {
                          setAction("counter"); setCounterError("");
                          try { await ridesApi.counterOffer(rideId, amount); setCounterSent(amount); }
                          catch (e) { setCounterError(getApiErrorMessage(e)); }
                          finally { setAction(null); }
                        }} style={[styles.button, { flex: 1, backgroundColor: colors.backgroundElevated, opacity: action ? 0.55 : 1 }]}>
                          <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>{amount.toLocaleString()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {counterError ? <Text style={[styles.error, { color: colors.error }]}>{counterError}</Text> : null}
              </View>
            ) : null}

            {!rideId ? (
              <Text style={[styles.error, { color: colors.error }]}>{t("drive.missing_id")}</Text>
            ) : null}
          </ScrollView>
          {/* Outside the scroll area: always in reach, and sliding never fights scrolling. */}
          <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
            {notice ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.error }]}>{notice}</Text> : null}
            <View style={styles.footerFare}>
              <Text style={[styles.footerAmount, { color: colors.success }]}>{Number(request.offeredFare ?? request.fare ?? 0).toLocaleString()} RWF</Text>
              {typeof request.driverEarning === "number" ? <Text style={[styles.fareLabel, { color: colors.textSecondary, flexShrink: 1, textAlign: "right" }]}>{t("drive.take_home")}: {request.driverEarning.toLocaleString()} RWF</Text> : null}
            </View>
            <SlideButton key={rideId} label={t("drive.accept_ride")} icon="check" color={colors.success} disabled={!rideId} loading={action === "accept"} onConfirm={() => submit("accept")} />
            <View style={styles.actions}>
              <TouchableOpacity accessibilityRole="button" disabled={action === "accept"} onPress={onLater} style={[styles.button, { backgroundColor: colors.backgroundElevated, opacity: action === "accept" ? 0.55 : 1 }]}>
                <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>{t("drive.later")}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={!rideId || action !== null} onPress={() => void submit("decline")} style={[styles.button, { backgroundColor: colors.backgroundElevated, opacity: !rideId || action ? 0.55 : 1 }]}>
                <Text style={[styles.secondaryText, { color: colors.error }]}>{t("drive.decline")}</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "91%",
    width: "100%", maxWidth: 760, alignSelf: "center",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
  },
  handle: { width: 46, height: 5, borderRadius: 3, alignSelf: "center" },
  overlayWide: { justifyContent: "center", padding: 32 },
  sheetWide: { flexDirection: "row", maxWidth: 1040, height: "86%", maxHeight: 720, borderRadius: 28, paddingTop: 0, overflow: "hidden" },
  wideMap: { flex: 1.1, padding: 12 },
  content: { padding: 20, gap: 18 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  footerFare: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  footerAmount: { flexShrink: 0, fontFamily: "Inter_700Bold", fontSize: 20 },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12 },
  pagerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pagerText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  title: { flexShrink: 1, fontFamily: "Inter_700Bold", fontSize: 24, marginTop: 9 },
  bell: {
    flexShrink: 0,
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  routeCard: { borderRadius: 20, padding: 17 },
  route: { flexDirection: "row", gap: 14 },
  rail: { width: 12, alignItems: "center", paddingVertical: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, flex: 1, minHeight: 42 },
  routeCopy: { flex: 1, minWidth: 0, gap: 22 },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  place: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 21 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  schedule: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scheduleValue: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  fareCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 17,
    alignItems: "center",
  },
  fareLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  fare: { fontFamily: "Inter_700Bold", fontSize: 27, marginTop: 4 },
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  button: {
    flexGrow: 1, flexBasis: 120,
    minHeight: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: { flexShrink: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 15 },
});
