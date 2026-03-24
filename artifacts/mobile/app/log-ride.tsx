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

import { driverApi } from "@/services/api";
import Colors from "@/constants/colors";
import { useT } from "@/context/I18nContext";

export default function LogRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();

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
        paymentMethod
      });
      router.back();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to log ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("log_ride")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("fare")} (RWF)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1500"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="number-pad"
            value={fare}
            onChangeText={setFare}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("distance")}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5.2"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="decimal-pad"
            value={distance}
            onChangeText={setDistance}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("pickup")}</Text>
          <TextInput
            style={styles.input}
            placeholder="Kigali Heights"
            placeholderTextColor={Colors.textSecondary}
            value={pickup}
            onChangeText={setPickup}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("dropoff")}</Text>
          <TextInput
            style={styles.input}
            placeholder="Remera"
            placeholderTextColor={Colors.textSecondary}
            value={dropoff}
            onChangeText={setDropoff}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("payment_method")}</Text>
          <View style={styles.paymentMethods}>
            <TouchableOpacity 
              style={[styles.methodBtn, paymentMethod === "cash" && styles.methodBtnActive]}
              onPress={() => setPaymentMethod("cash")}
            >
              <Feather name="dollar-sign" size={20} color={paymentMethod === "cash" ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.methodText, paymentMethod === "cash" && styles.methodTextActive]}>Cash</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.methodBtn, paymentMethod === "momo" && styles.methodBtnActive]}
              onPress={() => setPaymentMethod("momo")}
            >
              <Feather name="smartphone" size={20} color={paymentMethod === "momo" ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.methodText, paymentMethod === "momo" && styles.methodTextActive]}>MoMo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.textPrimary} />
          ) : (
            <Text style={styles.submitText}>Save Ride</Text>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
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
    color: Colors.textPrimary,
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
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textPrimary,
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
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  methodBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
  },
  methodText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  methodTextActive: {
    color: Colors.primary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
});
