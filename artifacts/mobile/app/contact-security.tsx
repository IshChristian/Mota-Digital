import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { usersApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";

export default function ContactSecurity() {
  const { colors } = useTheme();
  const [type, setType] = useState<"phone" | "email">("phone");
  const [value, setValue] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const request = async () => {
    setBusy(true);
    try {
      const r = await usersApi.requestContactChange(type, value.trim());
      setSent(true);
      Alert.alert("Code sent", r.data.message);
    } catch (e: any) {
      Alert.alert(
        "Unable to send code",
        e?.response?.data?.message || "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      await usersApi.verifyContactChange(otp);
      Alert.alert("Updated", "Your verified contact information was changed.");
      setSent(false);
      setOtp("");
      setValue("");
    } catch (e: any) {
      Alert.alert(
        "Unable to verify",
        e?.response?.data?.message || "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <PassengerSettingsScreen title="Verified contact">
      <Text style={{ color: colors.textSecondary }}>
        A confirmation code is sent to the new destination before it replaces
        your verified contact.
      </Text>
      <TouchableOpacity
        onPress={() => setType(type === "phone" ? "email" : "phone")}
        style={[s.outline, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.textPrimary }}>Changing: {type}</Text>
      </TouchableOpacity>
      <TextInput
        autoCapitalize="none"
        keyboardType={type === "email" ? "email-address" : "phone-pad"}
        value={value}
        onChangeText={setValue}
        placeholder={`New ${type}`}
        placeholderTextColor={colors.textTertiary}
        style={[
          s.input,
          { color: colors.textPrimary, borderColor: colors.border },
        ]}
      />
      {sent ? (
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          placeholder="6-digit code"
          placeholderTextColor={colors.textTertiary}
          style={[
            s.input,
            { color: colors.textPrimary, borderColor: colors.border },
          ]}
        />
      ) : null}
      <TouchableOpacity
        disabled={busy || !value}
        onPress={sent ? verify : request}
        style={[s.button, { backgroundColor: colors.primary }]}
      >
        <Text style={s.buttonText}>
          {busy
            ? "Please wait…"
            : sent
              ? "Confirm change"
              : "Send confirmation code"}
        </Text>
      </TouchableOpacity>
    </PassengerSettingsScreen>
  );
}
const s = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 14, padding: 15 },
  button: { padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontFamily: "Inter_700Bold" },
  outline: { padding: 14, borderWidth: 1, borderRadius: 14 },
});
