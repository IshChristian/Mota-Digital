import { safeBack } from "@/utils/navigation";
import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { authApi, getApiErrorMessage } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// When a code was last requested, so reopening the screen does not send another.
const lastSent = new Map<string, number>();
const RESEND_AFTER_S = 60;

export default function VerifyEmailScreen() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors } = useTheme();
  const { user, refreshAccount } = useAuth();

  const email = params.email || user?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [timer, setTimer] = useState(0);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    const value = text.replace(/\D/g, "");
    if (value.length > 1) {
      // A pasted or autofilled code fills the boxes from the first one.
      const next = value.length >= 6 ? value.slice(0, 6).split("") : otp.map((d, i) => value[i - index] ?? d);
      setOtp(next);
      inputs.current[Math.min(value.length >= 6 ? 5 : index + value.length, 5)]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (!value && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleContinue = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError(t("auth.enter_6"));
      return;
    }
    setLoading(true);
    setError("");
    setResendMsg("");
    try {
      await authApi.verifyEmailOtp({ email, otp: code });
      await refreshAccount();
      safeBack(router);
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Codes last 5 minutes, so someone opening this screen later needs a new one.
  useEffect(() => {
    if (!email) return;
    const wait = RESEND_AFTER_S - Math.floor((Date.now() - (lastSent.get(email) ?? 0)) / 1000);
    if (wait > 0) setTimer(wait);
    else void handleResendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleResendOtp = async () => {
    if (timer > 0 || resending) return;
    if (!email) { setError(t("email_verify.no_email")); return; }
    setResending(true);
    setError("");
    setResendMsg("");
    try {
      await authApi.resendEmailOtp({ email });
      lastSent.set(email, Date.now());
      setTimer(RESEND_AFTER_S);
      setResendMsg(t("email_verify.resent"));
      // Clear the OTP inputs
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => setResendMsg(""), 5000);
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.iconWrap}>
        <Feather name="mail" size={48} color={colors.primary} />
      </View>

      <Text style={s.title}>{t("email_verify.title")}</Text>
      <TouchableOpacity onPress={() => safeBack(router)} accessibilityRole="button" style={{ padding: 12 }}><Text style={{ color: colors.primary }}>{t("email_verify.later")}</Text></TouchableOpacity>
      <Text style={s.subtitle}>
        {t(resending ? "email_verify.sending" : "email_verify.sent_to")}{"\n"}
        <Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
        {"\n\n"}
        {t("email_verify.expires")}
      </Text>

      {error ? <Text style={s.errorText}>{error}</Text> : null}
      {resendMsg ? (
        <View style={s.successBanner}>
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text style={s.successText}>{resendMsg}</Text>
        </View>
      ) : null}

      <View style={s.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputs.current[index] = ref; }}
            style={[s.otpInput, digit ? s.otpInputFilled : null]}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            accessibilityLabel={t("email_verify.digit", { n: String(index + 1) })}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace" && !digit && index > 0) {
                inputs.current[index - 1]?.focus();
              }
            }}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[s.button, otp.some(v => !v) && s.buttonDisabled]}
        onPress={handleContinue}
        disabled={loading || otp.some(v => !v)}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>{t("email_verify.button")}</Text>
        )}
      </TouchableOpacity>

      <View style={s.resendContainer}>
        <Text style={s.resendText}>{t("auth.no_code")} </Text>
        <TouchableOpacity onPress={handleResendOtp} disabled={timer > 0 || resending}>
          {resending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[s.resendLink, timer > 0 && s.resendDisabled]}>
              {t("email_verify.resend")} {timer > 0 ? `(${timer}s)` : ""}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
      justifyContent: "center",
    },
    iconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 16,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
    },
    otpContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 440,
      marginBottom: 32,
      gap: 8,
    },
    otpInput: {
      flex: 1,
      // Browser inputs won't shrink below their default width without this.
      minWidth: 0,
      height: 60,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      color: colors.textPrimary,
      fontSize: 24,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
    },
    otpInputFilled: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}1A`,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    button: {
      width: "100%",
      maxWidth: 440,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      marginBottom: 16,
      textAlign: "center",
    },
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: `${colors.success}18`,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
      width: "100%",
      maxWidth: 440,
    },
    successText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.success,
    },
    resendContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 24,
    },
    resendText: {
      color: colors.textSecondary,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    resendLink: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    resendDisabled: {
      color: colors.textTertiary,
    },
  });
