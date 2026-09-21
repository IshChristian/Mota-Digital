import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { usersApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function SecurityScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { colors } = useTheme();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const change = async () => {
    if (next.length < 10)
      return Alert.alert("Password too short", "Use at least 10 characters.");
    if (next !== confirm) return Alert.alert("Passwords do not match");
    setBusy(true);
    try {
      await usersApi.changePassword(current, next);
      Alert.alert("Password changed", "Sign in again with your new password.", [
        { text: "Continue", onPress: logout },
      ]);
    } catch (e: any) {
      Alert.alert(
        "Unable to change password",
        e?.response?.data?.message || "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <PassengerSettingsScreen title="Security">
      <Text style={{ color: colors.textSecondary }}>
        Changing your password signs out every device.
      </Text>
      {[
        ["Current password", current, setCurrent],
        ["New password", next, setNext],
        ["Confirm new password", confirm, setConfirm],
      ].map(([label, value, setter]) => (
        <TextInput
          key={label as string}
          secureTextEntry
          placeholder={label as string}
          placeholderTextColor={colors.textTertiary}
          value={value as string}
          onChangeText={setter as (v: string) => void}
          style={[
            s.input,
            { color: colors.textPrimary, borderColor: colors.border },
          ]}
        />
      ))}
      <TouchableOpacity
        disabled={busy}
        onPress={change}
        style={[s.button, { backgroundColor: colors.primary }]}
      >
        <Text style={s.buttonText}>{busy ? "Saving…" : "Change password"}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/contact-security" as any)}
        style={[s.outline, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.textPrimary }}>
          Change verified phone or email
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/account" as any)}
        style={[s.outline, { borderColor: colors.border }]}
      >
        <Text style={{ color: "#EF4444" }}>Account and data controls</Text>
      </TouchableOpacity>
    </PassengerSettingsScreen>
  );
}
const s = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 14, padding: 15 },
  button: { padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontFamily: "Inter_700Bold" },
  outline: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
});
