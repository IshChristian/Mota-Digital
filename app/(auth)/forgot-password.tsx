import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async () => {
    if (!email.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const r = await authApi.forgotPassword(email.trim().toLowerCase());
      setMessage(r.data.message);
    } catch (e: any) {
      setMessage(
        e?.response?.data?.message || "Unable to request a reset link.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[s.page, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: colors.primary }}>Back</Text>
      </TouchableOpacity>
      <Text style={[s.title, { color: colors.textPrimary }]}>
        Reset your password
      </Text>
      <Text style={{ color: colors.textSecondary }}>
        Enter your verified email. We will send a one-time link that expires
        after 30 minutes.
      </Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="Email address"
        placeholderTextColor={colors.textTertiary}
        style={[
          s.input,
          { color: colors.textPrimary, borderColor: colors.border },
        ]}
      />
      {message ? (
        <Text style={{ color: colors.textSecondary }}>{message}</Text>
      ) : null}
      <TouchableOpacity
        disabled={busy}
        onPress={submit}
        style={[s.button, { backgroundColor: colors.primary }]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>Send reset link</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, padding: 24, paddingTop: 70, gap: 18 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 28 },
  input: { borderWidth: 1, borderRadius: 14, padding: 15 },
  button: { padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontFamily: "Inter_700Bold" },
});
