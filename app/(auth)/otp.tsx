import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter all 6 digits"); return; }
    setLoading(true);
    setError("");
    try {
      await authApi.verifyOtp({ userId, otp: code });
      if (user) {
        await updateUser({ isVerified: true });
      } else {
        router.replace("/(auth)/login");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP");
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
      setError(err.response?.data?.message || "Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <View style={s.iconWrap}>
          <Feather name="message-square" size={40} color={colors.primary} />
        </View>
        <Text style={s.title}>{t("otp_verify")}</Text>
        <Text style={s.subtitle}>
          We sent a 6-digit code to{"\n"}
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
            <Text style={s.buttonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>

        <View style={s.resendContainer}>
          <Text style={s.resendText}>Didn't receive code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
            <Text style={[s.resendLink, timer > 0 && s.resendDisabled]}>
              Resend {timer > 0 ? `(${timer}s)` : ""}
            </Text>
          </TouchableOpacity>
        </View>
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
  });
