import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Modal } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";

type RideRequest = {
  id: string;
  pickup: {
    address: string;
    distanceKm?: number;
  };
  destination: {
    address: string;
    distanceKm?: number;
  };
  offeredFare: number;
  expiresInSeconds?: number;
  passengers?: number;
  scheduledTime?: string;
  scheduledDate?: string;
};

interface RideRequestModalProps {
  request: RideRequest | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export function RideRequestModal({ request, onAccept, onDecline }: RideRequestModalProps) {
  const { colors, isDark } = useTheme();
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (request) {
      setTimeLeft(request.expiresInSeconds || 30);
    }
  }, [request]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (request && timeLeft === 0) {
        onDecline(request.id); // Auto-decline when time runs out
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, request, onDecline]);

  if (!request) return null;

  const pickupAddr = typeof request.pickup === 'string' ? request.pickup : (request.pickup?.address || 'Pickup Location');
  const destAddr = typeof request.destination === 'string' ? request.destination : (request.destination?.address || 'Destination Location');
  const pickupDist = request.pickup?.distanceKm ?? 0.5;
  const tripDist = request.destination?.distanceKm ?? 3.2;
  const passengersCount = request.passengers || 1;
  const scheduled = request.scheduledTime ? `${request.scheduledDate || ''} ${request.scheduledTime}`.trim() : 'Immediate (Now)';

  return (
    <Modal visible={!!request} transparent animationType="slide">
      <View style={styles(colors, isDark).overlay}>
        <View style={styles(colors, isDark).modalContent}>
          <View style={styles(colors, isDark).header}>
            <Feather name="bell" size={20} color="#E63946" />
            <Text style={styles(colors, isDark).headerText}>NEW MOTA RIDE REQUEST</Text>
          </View>

          <View style={styles(colors, isDark).detailsContainer}>
            <View style={styles(colors, isDark).detailRow}>
              <View style={styles(colors, isDark).labelContainer}>
                <Feather name="map-pin" size={14} color={colors.textSecondary} />
                <Text style={styles(colors, isDark).labelText}>Passenger Location (Pickup)</Text>
              </View>
              <Text style={styles(colors, isDark).valueText}>{pickupAddr}</Text>
            </View>

            <View style={styles(colors, isDark).detailRow}>
              <View style={styles(colors, isDark).labelContainer}>
                <Feather name="flag" size={14} color={colors.textSecondary} />
                <Text style={styles(colors, isDark).labelText}>Destination (Going to)</Text>
              </View>
              <Text style={styles(colors, isDark).valueText}>{destAddr}</Text>
            </View>
            
            <View style={styles(colors, isDark).divider} />

            <View style={styles(colors, isDark).statsRow}>
              <View style={styles(colors, isDark).statBox}>
                <Feather name="users" size={14} color={colors.primary} style={{ marginBottom: 2 }} />
                <Text style={styles(colors, isDark).statLabel}>Passengers</Text>
                <Text style={styles(colors, isDark).statValue}>{passengersCount} Person(s)</Text>
              </View>
              <View style={styles(colors, isDark).statBox}>
                <Feather name="clock" size={14} color={colors.primary} style={{ marginBottom: 2 }} />
                <Text style={styles(colors, isDark).statLabel}>Requested Time</Text>
                <Text style={styles(colors, isDark).statValue}>{scheduled}</Text>
              </View>
            </View>

            <View style={styles(colors, isDark).statsRow}>
              <View style={styles(colors, isDark).statBox}>
                <Text style={styles(colors, isDark).statLabel}>Pickup dist</Text>
                <Text style={styles(colors, isDark).statValue}>{pickupDist.toFixed(1)} km</Text>
              </View>
              <View style={styles(colors, isDark).statBox}>
                <Text style={styles(colors, isDark).statLabel}>Trip dist</Text>
                <Text style={styles(colors, isDark).statValue}>{tripDist.toFixed(1)} km</Text>
              </View>
            </View>

            <View style={styles(colors, isDark).offerBox}>
              <Text style={styles(colors, isDark).offerLabel}>Total Ride Fare</Text>
              <Text style={styles(colors, isDark).offerAmount}>
                {(request.offeredFare || 0).toLocaleString()} RWF
              </Text>
            </View>

            <View style={styles(colors, isDark).timerBox}>
              <Text style={styles(colors, isDark).timerLabel}>Auto-decline in</Text>
              <Text style={styles(colors, isDark).timerText}>00:{timeLeft.toString().padStart(2, '0')}</Text>
            </View>
          </View>

          <View style={styles(colors, isDark).actions}>
            <TouchableOpacity 
              style={[styles(colors, isDark).button, styles(colors, isDark).declineBtn]}
              onPress={() => onDecline(request.id)}
            >
              <Text style={styles(colors, isDark).declineBtnText}>DECLINE</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles(colors, isDark).button, styles(colors, isDark).acceptBtn]}
              onPress={() => onAccept(request.id)}
            >
              <Feather name="check-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles(colors, isDark).acceptBtnText}>
                PICK RIDE (ACCEPT)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  headerText: {
    color: "#E63946",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  detailsContainer: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  labelText: {
    color: colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  valueText: {
    color: colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginLeft: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  statLabel: {
    color: colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  offerBox: {
    backgroundColor: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.3)",
    marginBottom: 16,
  },
  offerLabel: {
    color: colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: 4,
  },
  offerAmount: {
    color: "#10B981",
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  timerBox: {
    alignItems: "center",
  },
  timerLabel: {
    color: colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  timerText: {
    color: colors.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  },
  declineBtnText: {
    color: colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
