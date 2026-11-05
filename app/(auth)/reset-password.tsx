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
import { useT } from "@/context/I18nContext";

export default function ResetPasswordScreen() {
  const t = useT();
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
      setMessage(t("auth.pw_short"));
      return;
    }
    if (password !== confirm) {
      setMessage(t("auth.pw_mismatch"));
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      setMessage(t("auth.pw_changed"));
      setTimeout(() => router.replace("/(auth)/login"), 800);
    } catch (e: any) {
      setMessage(
        e?.response?.data?.message || t("auth.reset_invalid"),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[s.page, { backgroundColor: colors.background }]}>
      <Text style={[s.title, { color: colors.textPrimary }]}>
        {t("auth.new_pw_title")}
      </Text>
      {!linkToken ? (
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder={t("auth.reset_token")}
          placeholderTextColor={colors.textTertiary}
          style={[
            s.input,
            { color: colors.textPrimary, borderColor: colors.inputBorder, backgroundColor: colors.inputBg },
          ]}
        />
      ) : null}
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder={t("auth.new_pw")}
        placeholderTextColor={colors.textTertiary}
        style={[
          s.input,
          { color: colors.textPrimary, borderColor: colors.inputBorder, backgroundColor: colors.inputBg },
        ]}
      />
      <TextInput
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t("auth.confirm_pw")}
        placeholderTextColor={colors.textTertiary}
        style={[
          s.input,
          { color: colors.textPrimary, borderColor: colors.inputBorder, backgroundColor: colors.inputBg },
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
          <Text style={s.buttonText}>{t("auth.update_pw")}</Text>
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
