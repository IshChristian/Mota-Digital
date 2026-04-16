import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymentRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    userId?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>();
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();

  const displayName = params.firstName && params.lastName
    ? `${params.firstName} ${params.lastName}`
    : `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  const displayPhone = params.phone || user?.phone || "";
  const displayEmail = params.email || user?.email || "";

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      await authApi.payRegistration({ phone: displayPhone });
      setSuccess(true);
      // Poll or just wait a moment then go to dashboard
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Payment initiation failed";
      if (msg.toLowerCase().includes("already active")) {
        router.replace("/(tabs)");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  if (success) {
    return (
      <View style={[s.container, { paddingTop: insets.top + 24 }]}>
        <View style={s.successIcon}>
          <Feather name="check-circle" size={64} color={colors.success} />
        </View>
        <Text style={s.successTitle}>Payment Initiated!</Text>
        <Text style={s.successDesc}>
          You'll receive a MoMo push notification to approve the payment of{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>10,000 RWF</Text>.
          {"\n\n"}Waiting for payment confirmation...
        </Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.iconWrap}>
        <Feather name="smartphone" size={40} color={colors.primary} />
      </View>

      <Text style={s.title}>Registration Fee</Text>
      <Text style={s.subtitle}>
        A one-time registration fee is required to activate your MOTA driver account.
      </Text>

      {/* User info card */}
      <View style={s.infoCard}>
        <Text style={s.infoCardTitle}>Account Details</Text>
        {displayName ? (
          <View style={s.infoRow}>
            <Feather name="user" size={15} color={colors.textSecondary} />
            <Text style={s.infoText}>{displayName}</Text>
          </View>
        ) : null}
        {displayEmail ? (
          <View style={s.infoRow}>
            <Feather name="mail" size={15} color={colors.textSecondary} />
            <Text style={s.infoText}>{displayEmail}</Text>
          </View>
        ) : null}
        {displayPhone ? (
          <View style={s.infoRow}>
            <Feather name="phone" size={15} color={colors.textSecondary} />
            <Text style={s.infoText}>{displayPhone}</Text>
          </View>
        ) : null}
      </View>

      {/* Payment amount */}
      <View style={s.payCard}>
        <Text style={s.payLabel}>Amount to Pay</Text>
        <Text style={s.payAmount}>10,000 RWF</Text>
        <View style={s.payRow}>
          <Feather name="smartphone" size={14} color={colors.textSecondary} />
          <Text style={s.payNote}>via MTN MoMo to {displayPhone}</Text>
        </View>
      </View>

      {error ? (
        <View style={s.errorBox}>
          <Feather name="alert-circle" size={16} color={colors.error} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={s.payBtn} onPress={handlePay} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="credit-card" size={20} color="#fff" />
            <Text style={s.payBtnText}>Pay 10,000 RWF</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={s.disclaimer}>
        You will receive a MoMo push notification to confirm the payment. Make sure your phone is on.
      </Text>
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    infoCard: {
      width: "100%",
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoCardTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textPrimary,
    },
    payCard: {
      width: "100%",
      backgroundColor: `${colors.primary}12`,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: `${colors.primary}30`,
    },
    payLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
      marginBottom: 8,
    },
    payAmount: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    payRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    payNote: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: `${colors.error}12`,
      borderRadius: 10,
      padding: 12,
      width: "100%",
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.error,
    },
    payBtn: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    payBtnText: {
      color: "#fff",
      fontSize: 17,
      fontFamily: "Inter_700Bold",
    },
    disclaimer: {
      marginTop: 16,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 18,
    },
    successIcon: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${colors.success}18`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      marginTop: 40,
    },
    successTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 12,
    },
    successDesc: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    skipBtn: {
      marginTop: 16,
      padding: 8,
    },
    skipText: {
      color: colors.textTertiary,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
  });
