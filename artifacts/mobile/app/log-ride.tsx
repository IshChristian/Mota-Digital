import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { driverApi, algorithmApi } from "@/services/api";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";

export default function LogRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { colors } = useTheme();

  const [fare, setFare] = useState("");
  const [distance, setDistance] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fare || !distance || !pickup || !dropoff) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      await driverApi.logRide({
        fare: Number(fare),
        distance: Number(distance),
        pickupLocation: pickup,
        dropoffLocation: dropoff,
        paymentMethod,
      });

      // Process through Algorithm Engine
      try {
        await algorithmApi.completeRide();
      } catch (e) {
        console.log("Algorithm engine process failed, but ride logged", e);
      }

      router.back();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to log ride");
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[s.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>{t("log_ride")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.inputGroup}>
          <Text style={s.label}>{t("fare")} (RWF)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 1500"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            value={fare}
            onChangeText={setFare}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>{t("distance")}</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 5.2"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={distance}
            onChangeText={setDistance}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>{t("pickup")}</Text>
          <TextInput
            style={s.input}
            placeholder="Kigali Heights"
            placeholderTextColor={colors.textTertiary}
            value={pickup}
            onChangeText={setPickup}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>{t("dropoff")}</Text>
          <TextInput
            style={s.input}
            placeholder="Remera"
            placeholderTextColor={colors.textTertiary}
            value={dropoff}
            onChangeText={setDropoff}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>{t("payment_method")}</Text>
          <View style={s.paymentMethods}>
            <TouchableOpacity
              style={[s.methodBtn, paymentMethod === "cash" && s.methodBtnActive]}
              onPress={() => setPaymentMethod("cash")}
            >
              <Feather name="dollar-sign" size={20} color={paymentMethod === "cash" ? colors.primary : colors.textSecondary} />
              <Text style={[s.methodText, paymentMethod === "cash" && s.methodTextActive]}>Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.methodBtn, paymentMethod === "momo" && s.methodBtnActive]}
              onPress={() => setPaymentMethod("momo")}
            >
              <Feather name="smartphone" size={20} color={paymentMethod === "momo" ? colors.primary : colors.textSecondary} />
              <Text style={[s.methodText, paymentMethod === "momo" && s.methodTextActive]}>MoMo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={s.submitBtn}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitText}>Save Ride</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.textPrimary,
    },
    paymentMethods: {
      flexDirection: "row",
      gap: 16,
    },
    methodBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    methodBtnActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}12`,
    },
    methodText: {
      fontSize: 16,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    methodTextActive: {
      color: colors.primary,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    submitText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
