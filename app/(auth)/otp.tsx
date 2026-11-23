import { safeBack } from "@/utils/navigation";
import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OtpScreen() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  // WhatsApp fallback: "idle" → "waiting" (link opened, polling) | "unavailable" (backend not set up).
  const [waState, setWaState] = useState<"idle" | "starting" | "waiting" | "unavailable">("idle");
  const [waLink, setWaLink] = useState("");
  const [waExpiresAt, setWaExpiresAt] = useState(0);

  const { user, updateUser } = useAuth();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string; phone?: string; fromRegister?: string; email?: string; fromLogin?: string }>();
  const inputs = useRef<Array<TextInput | null>>([]);
  const { colors } = useTheme();

  const phone = params.phone || user?.phone;
  const userId = params.userId || user?.id;
  const fromRegister = params.fromRegister === "1";
  const hasEmail = !!(params.email && params.email.includes("@"));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (!value && index > 0) inputs.current[index - 1]?.focus();
  };

  // Same next step as a correct SMS code.
  const onVerified = async () => {
    if (user) {
      await updateUser({ isVerified: true });
    } else {
      router.replace("/(auth)/login");
    }
  };

  const openWhatsApp = (link: string) => {
    if (Platform.OS === "web") window.open(link, "_blank", "noopener");
    else Linking.openURL(link).catch(() => setError(t("auth.wa_unavailable")));
  };

  const startWhatsApp = async () => {
    if (!userId) return;
    setError("");
    setWaState("starting");
    try {
      const { data } = await authApi.whatsappStart(String(userId));
      setWaLink(data.link);
      setWaExpiresAt(new Date(data.expiresAt).getTime());
      setWaState("waiting");
      openWhatsApp(data.link);
    } catch (err: any) {
      if (err.response?.status === 503) {
        setWaState("unavailable");
      } else {
        setWaState("idle");
        setError(err.response?.data?.message || t("auth.wa_unavailable"));
      }
    }
  };

  // While the user is in WhatsApp: poll every 5 s until the code expires, and check
  // straight away when they come back to the app.
  useEffect(() => {
    if (waState !== "waiting" || !userId) return;
    let done = false;
    const check = async () => {
      if (done) return;
      if (Date.now() > waExpiresAt) { done = true; setWaState("idle"); return; }
      try {
        const { data } = await authApi.whatsappStatus(String(userId));
        if (data.verified && !done) { done = true; await onVerified(); }
      } catch { /* keep polling; a dropped request isn't a failure */ }
    };
    const interval = setInterval(check, 5000);
    const sub = AppState.addEventListener("change", (next) => { if (next === "active") check(); });
    const onFocus = () => check();
    if (Platform.OS === "web") window.addEventListener("focus", onFocus);
    return () => {
      done = true;
      clearInterval(interval);
      sub.remove();
      if (Platform.OS === "web") window.removeEventListener("focus", onFocus);
    };
  }, [waState, waExpiresAt, userId]);

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError(t("auth.enter_6")); return; }
    setLoading(true);
    setError("");
    try {
      await authApi.verifyOtp({ userId, otp: code });
      await onVerified();
    } catch (err: any) {
      setError(err.response?.data?.message || t("auth.invalid_otp"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      await authApi.resendOtp({ phone });
      setTimer(60);
    } catch (err: any) {
      setError(err.response?.data?.message || t("auth.resend_failed"));
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => safeBack(router)} style={s.backButton}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <View style={s.iconWrap}>
          <Feather name="message-square" size={40} color={colors.primary} />
        </View>
        <Text style={s.title}>{t("otp_verify")}</Text>
        <Text style={s.subtitle}>
          {t("email_verify.code_sent_to")}{"\n"}
          <Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>
            {phone || "+250 XXX XXX XXX"}
          </Text>
        </Text>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <View style={s.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputs.current[index] = ref; }}
              style={[s.otpInput, digit ? s.otpInputFilled : null]}
              keyboardType="number-pad"
              maxLength={1}
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
          onPress={verifyOtp}
          disabled={loading || otp.some(v => !v)}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>{t("auth.verify_otp")}</Text>
          )}
        </TouchableOpacity>

        <View style={s.resendContainer}>
          <Text style={s.resendText}>{t("auth.no_code")} </Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
            <Text style={[s.resendLink, timer > 0 && s.resendDisabled]}>
              {t("email_verify.resend")} {timer > 0 ? `(${timer}s)` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {userId && waState !== "unavailable" ? (
          <>
            <TouchableOpacity
              style={s.waButton}
              onPress={waState === "waiting" ? () => openWhatsApp(waLink) : startWhatsApp}
              disabled={waState === "starting"}
            >
              {waState === "starting" ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Feather name="message-circle" size={18} color={colors.primary} />
                  <Text style={s.waButtonText}>
                    {waState === "waiting" ? t("auth.wa_open_again") : t("auth.wa_verify")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {waState === "waiting" ? <Text style={s.waHint}>{t("auth.wa_waiting")}</Text> : null}
          </>
        ) : null}
        {waState === "unavailable" ? <Text style={s.waHint}>{t("auth.wa_unavailable")}</Text> : null}
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
    },
    header: {
      paddingVertical: 12,
      marginBottom: 16,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: "center",
    },
    content: {
      flex: 1,
      alignItems: "center",
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}20`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginBottom: 32,
      textAlign: "center",
      lineHeight: 22,
    },
    otpContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
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
    button: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.5,
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
      marginBottom: 24,
      textAlign: "center",
    },
    resendContainer: {
      flexDirection: "row",
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
    waButton: {
      width: "100%",
      marginTop: 24,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    waButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    waHint: {
      marginTop: 12,
      color: colors.textSecondary,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      textAlign: "center",
    },
  });
