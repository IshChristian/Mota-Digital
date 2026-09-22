import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ridesApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";

export default function CheckoutScreen() {
  const { rideId, amount } = useLocalSearchParams<{
    rideId?: string;
    amount?: string;
  }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pay = async () => {
    if (!rideId) {
      setError("A ride reference is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await ridesApi.payRide(rideId);
      router.replace({
        pathname: "/system/success",
        params: {
          title: "Payment confirmed",
          message: "The ride payment was recorded successfully.",
          returnTo: "/",
        },
      } as any);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Payment could not be completed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[s.page, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={[s.back, { borderColor: colors.border }]}
      >
        <Feather name="arrow-left" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[s.title, { color: colors.textPrimary }]}>
        Ride checkout
      </Text>
      <Text style={[s.sub, { color: colors.textSecondary }]}>
        Review the confirmed amount before authorizing payment from your MOTA
        wallet.
      </Text>
      <View
        style={[
          s.card,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[s.label, { color: colors.textSecondary }]}>
          AMOUNT DUE
        </Text>
        <Text style={[s.amount, { color: colors.textPrimary }]}>
          {Number(amount || 0).toLocaleString()} RWF
        </Text>
        <View style={[s.row, { borderTopColor: colors.border }]}>
          <Feather name="shield" size={18} color={colors.success} />
          <Text style={{ color: colors.textSecondary, flex: 1 }}>
            Payment is processed by the backend and recorded in your transaction
            history.
          </Text>
        </View>
      </View>
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      <TouchableOpacity
        disabled={busy || !rideId}
        onPress={pay}
        style={[
          s.pay,
          {
            backgroundColor: colors.primary,
            opacity: busy || !rideId ? 0.7 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="lock" size={18} color="#fff" />
            <Text style={s.payText}>Confirm wallet payment</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, padding: 20, paddingTop: 58 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 29, marginTop: 24 },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },
  card: { borderWidth: 1, borderRadius: 22, padding: 22, marginTop: 28 },
  label: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  amount: { fontFamily: "Inter_700Bold", fontSize: 34, marginTop: 7 },
  row: {
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  pay: {
    minHeight: 56,
    borderRadius: 18,
    marginTop: 22,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  payText: { color: "#fff", fontFamily: "Inter_700Bold" },
});
