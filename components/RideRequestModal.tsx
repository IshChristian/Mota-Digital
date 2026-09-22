import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Metric, StatusPill } from "@/components/driver/DriverUI";

type RideRequest = {
  id?: string;
  _id?: string;
  pickup?: { address?: string; name?: string; distanceKm?: number } | string;
  destination?:
    | { address?: string; name?: string; distanceKm?: number }
    | string;
  offeredFare?: number;
  fare?: number;
  passengers?: number;
  scheduledTime?: string;
  scheduledDate?: string;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
};

interface RideRequestModalProps {
  request: RideRequest | null;
  onAccept: (id: string) => Promise<void> | void;
  onDecline: (id: string) => Promise<void> | void;
}

function place(value: RideRequest["pickup"], fallback: string) {
  if (typeof value === "string") return value;
  return value?.name || value?.address || fallback;
}

export function RideRequestModal({
  request,
  onAccept,
  onDecline,
}: RideRequestModalProps) {
  const { colors } = useTheme();
  const [action, setAction] = useState<"accept" | "decline" | null>(null);

  useEffect(() => setAction(null), [request]);

  if (!request) return null;
  const rideId = request.id || request._id;
  const pickup = place(request.pickup, "Pickup location");
  const destination = place(request.destination, "Destination");
  const tripDistance =
    request.estimatedDistanceKm ??
    (typeof request.destination === "object"
      ? request.destination?.distanceKm
      : undefined);
  const pickupDistance =
    typeof request.pickup === "object" ? request.pickup?.distanceKm : undefined;
  const scheduled = request.scheduledTime
    ? `${request.scheduledDate || ""} ${request.scheduledTime}`.trim()
    : "As soon as possible";

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
    <Modal visible transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          style={[styles.sheet, { backgroundColor: colors.backgroundCard }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.titleRow}>
              <View>
                <StatusPill label="New ride request" tone="warning" />
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Review before accepting
                </Text>
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
                    >
                      PICKUP
                    </Text>
                    <Text style={[styles.place, { color: colors.textPrimary }]}>
                      {pickup}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      DESTINATION
                    </Text>
                    <Text style={[styles.place, { color: colors.textPrimary }]}>
                      {destination}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.metrics}>
              <Metric
                label="To pickup"
                value={
                  pickupDistance === undefined
                    ? "—"
                    : `${pickupDistance.toFixed(1)} km`
                }
                icon="navigation"
              />
              <Metric
                label="Trip"
                value={
                  tripDistance === undefined
                    ? "—"
                    : `${Number(tripDistance).toFixed(1)} km`
                }
                icon="map"
              />
              <Metric
                label="Passengers"
                value={String(request.passengers || 1)}
                icon="users"
              />
            </View>

            <View style={[styles.schedule, { borderColor: colors.border }]}>
              <Feather name="clock" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  REQUESTED TIME
                </Text>
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
              <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>
                Passenger offer
              </Text>
              <Text style={[styles.fare, { color: colors.success }]}>
                {Number(
                  request.offeredFare ?? request.fare ?? 0,
                ).toLocaleString()}{" "}
                RWF
              </Text>
            </View>

            {!rideId ? (
              <Text style={[styles.error, { color: colors.error }]}>
                This request is missing its ride identifier. Refresh requests
                before continuing.
              </Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={!rideId || action !== null}
                onPress={() => void submit("decline")}
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.backgroundElevated,
                    opacity: !rideId || action ? 0.55 : 1,
                  },
                ]}
              >
                {action === "decline" ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text
                    style={[
                      styles.secondaryText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Decline
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={!rideId || action !== null}
                onPress={() => void submit("accept")}
                style={[
                  styles.button,
                  styles.accept,
                  {
                    backgroundColor: colors.primary,
                    opacity: !rideId || action ? 0.55 : 1,
                  },
                ]}
              >
                {action === "accept" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#fff" />
                    <Text style={styles.acceptText}>Accept ride</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
  },
  handle: { width: 46, height: 5, borderRadius: 3, alignSelf: "center" },
  content: { padding: 20, paddingBottom: 36, gap: 18 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, marginTop: 9 },
  bell: {
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
  routeCopy: { flex: 1, gap: 22 },
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  place: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 21 },
  metrics: { flexDirection: "row", gap: 12 },
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
  actions: { flexDirection: "row", gap: 12 },
  button: {
    flex: 1,
    minHeight: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  accept: { flex: 1.5 },
  secondaryText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  acceptText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
});
