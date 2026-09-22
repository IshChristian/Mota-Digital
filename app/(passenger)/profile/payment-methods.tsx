import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { useTheme } from "@/context/ThemeContext";
import { productionApi } from "@/services/api";

type Method = {
  _id: string;
  label: string;
  maskedAccount: string;
  status: string;
  isDefault: boolean;
  lastFailure?: { message: string };
};
export default function PaymentMethods() {
  const { colors } = useTheme();
  const [items, setItems] = useState<Method[]>([]);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      productionApi
        .paymentMethods()
        .then((r) => setItems(r.data.data || []))
        .catch((e) =>
          Alert.alert(
            "Unable to load",
            e?.response?.data?.message || "Try again.",
          ),
        ),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const add = async () => {
    setBusy(true);
    try {
      const r = await productionApi.addPaymentMethod({
        type: "momo",
        label: "Mobile Money",
        phone: phone.trim(),
      });
      setPendingId(r.data.data._id);
      Alert.alert(
        "Code sent",
        "Enter the verification code sent to the phone.",
      );
    } catch (e: any) {
      Alert.alert("Not added", e?.response?.data?.message || "Try again.");
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      await productionApi.verifyPaymentMethod(pendingId, otp.trim());
      setPhone("");
      setOtp("");
      setPendingId("");
      await load();
    } catch (e: any) {
      Alert.alert("Not verified", e?.response?.data?.message || "Try again.");
    } finally {
      setBusy(false);
    }
  };
  const input = [
    s.input,
    { borderColor: colors.border, color: colors.textPrimary },
  ];
  return (
    <PassengerSettingsScreen title="Payment methods">
      <Text style={{ color: colors.textSecondary }}>
        Add and verify Mobile Money accounts. MOTA never stores your payment
        PIN.
      </Text>
      {pendingId ? (
        <>
          <TextInput
            style={input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            placeholder="Verification code"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            disabled={busy}
            onPress={verify}
            style={[s.primary, { backgroundColor: colors.primary }]}
          >
            <Text style={s.primaryText}>Verify method</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Mobile Money phone"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            disabled={busy || !phone.trim()}
            onPress={add}
            style={[s.primary, { backgroundColor: colors.primary }]}
          >
            <Text style={s.primaryText}>
              {busy ? "Sending…" : "Add payment method"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      {items.map((item) => (
        <View
          key={item._id}
          style={[
            s.card,
            {
              borderColor: colors.border,
              backgroundColor: colors.backgroundCard,
            },
          ]}
        >
          <View style={s.row}>
            <View>
              <Text style={[s.title, { color: colors.textPrimary }]}>
                {item.label}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {item.maskedAccount} · {item.status}
              </Text>
            </View>
            {item.isDefault ? (
              <Feather name="check-circle" size={22} color={colors.primary} />
            ) : null}
          </View>
          {item.lastFailure ? (
            <Text style={{ color: colors.error }}>
              Last failure: {item.lastFailure.message}
            </Text>
          ) : null}
          <View style={s.actions}>
            {!item.isDefault && item.status === "verified" ? (
              <TouchableOpacity
                onPress={async () => {
                  await productionApi.defaultPaymentMethod(item._id);
                  await load();
                }}
              >
                <Text style={{ color: colors.primary }}>Make default</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={async () => {
                try {
                  await productionApi.removePaymentMethod(item._id);
                  await load();
                } catch (e: any) {
                  Alert.alert(
                    "Cannot remove",
                    e?.response?.data?.message || "Try again.",
                  );
                }
              }}
            >
              <Text style={{ color: colors.error }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {Platform.OS === "web" && pendingId ? (
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          Check the phone for the verification code.
        </Text>
      ) : null}
    </PassengerSettingsScreen>
  );
}
const s = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 12, padding: 14 },
  primary: { padding: 15, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontFamily: "Inter_700Bold" },
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 16 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 20 },
});
