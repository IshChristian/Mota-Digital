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
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();

  const email = params.email || user?.email || "your email";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [timer, setTimer] = useState(60);
  const inputs = useRef<Array<TextInput | null>>([]);

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

  const handleContinue = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.verifyEmailOtp({ email, otp: code });
      await updateUser({ isEmailVerified: true });
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    setResending(true);
    setError("");
    setResendMsg("");
    try {
      await authApi.resendEmailOtp({ email });
      setTimer(60);
      setResendMsg("A new code has been sent to your email");
      // Clear the OTP inputs
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => setResendMsg(""), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend code");
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

      <Text style={s.title}>Verify Your Email</Text>
      <Text style={s.subtitle}>
        We sent a 6-digit verification code to{"\n"}
        <Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
        {"\n\n"}
        Please check your inbox and enter the code below.
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
        onPress={handleContinue}
        disabled={loading || otp.some(v => !v)}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>Verify Email</Text>
        )}
      </TouchableOpacity>

      <View style={s.resendContainer}>
        <Text style={s.resendText}>Didn't receive code? </Text>
        <TouchableOpacity onPress={handleResendOtp} disabled={timer > 0 || resending}>
          {resending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[s.resendLink, timer > 0 && s.resendDisabled]}>
              Resend {timer > 0 ? `(${timer}s)` : ""}
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
    buttonDisabled: {
      opacity: 0.5,
    },
    button: {
      width: "100%",
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
