import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { authApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";

export default function ResetPasswordScreen() {
  const { token: linkToken } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [token, setToken] = useState(linkToken || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async () => {
    if (password.length < 10) {
      setMessage("Password must contain at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      setMessage("Password changed. You can now sign in.");
      setTimeout(() => router.replace("/(auth)/login"), 800);
    } catch (e: any) {
      setMessage(
        e?.response?.data?.message || "Reset link is invalid or expired.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[s.page, { backgroundColor: colors.background }]}>
      <Text style={[s.title, { color: colors.textPrimary }]}>
        Create a new password
      </Text>
      {!linkToken ? (
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="Reset token"
          placeholderTextColor={colors.textTertiary}
          style={[
            s.input,
            { color: colors.textPrimary, borderColor: colors.border },
          ]}
        />
      ) : null}
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="New password"
        placeholderTextColor={colors.textTertiary}
        style={[
          s.input,
          { color: colors.textPrimary, borderColor: colors.border },
        ]}
      />
      <TextInput
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Confirm new password"
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
        disabled={busy || !token}
        onPress={submit}
        style={[s.button, { backgroundColor: colors.primary }]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>Update password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, padding: 24, paddingTop: 80, gap: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 18 },
  input: { borderWidth: 1, borderRadius: 14, padding: 15 },
  button: { padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontFamily: "Inter_700Bold" },
});
