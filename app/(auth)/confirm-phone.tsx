import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RwandaPhoneInput } from "@/components/RwandaPhoneInput";
import { normalizeRwandaPhone } from "@/utils/rwandaPhone";

export default function ConfirmPhoneScreen() {
  const router = useRouter();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ userId?: string; phone?: string; fromRegister?: string; email?: string }>();

  const [phone, setPhone] = useState(params.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const logoSource = isDark
    ? require("@/assets/images/official-mota-white-logo-removebg-preview.png")
    : require("@/assets/images/official-mota-black-logo-removebg-preview.png");

  const handleSendOtp = async () => {
    const normalizedPhone = normalizeRwandaPhone(phone);
    if (!normalizedPhone) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Call resend OTP to ensure it actually triggers a new SMS if prompted
      await authApi.resendOtp({ phone: normalizedPhone });
      
      router.push({
        pathname: "/(auth)/otp",
        params: {
          userId: params.userId,
          phone: normalizedPhone,
          fromRegister: params.fromRegister,
          email: params.email
        },
      });
    } catch (err: any) {
      const errMsg = (err.response?.data?.message || "").toLowerCase();
      // If the backend says "already verified" — user doesn't need this screen
      if (errMsg.includes("already verified") || errMsg.includes("already been verified")) {
        // Cache the verified status and go back to login
        await AsyncStorage.setItem(
          `verification_cache_${normalizedPhone}`,
          JSON.stringify({ isVerified: true, updatedAt: new Date().toISOString() })
        );
        router.replace("/(auth)/login");
      } else {
        setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={s.header}>
          <Image source={logoSource} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>Confirm Phone Number</Text>
          <Text style={s.subtitle}>
            Please confirm your phone number to receive a verification code.
          </Text>
        </View>

        <View style={s.form}>
          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <View style={s.inputGroup}>
            <Text style={s.label}>Phone Number</Text>
            <RwandaPhoneInput value={phone} onChangeText={setPhone} accessibilityLabel="Phone number to verify" />
          </View>

          <TouchableOpacity
            style={s.button}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Send Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
    },
    backBtn: {
      marginBottom: 8,
      padding: 4,
      alignSelf: "flex-start",
    },
    header: {
      alignItems: "center",
      marginTop: 20,
      marginBottom: 40,
    },
    logo: {
      width: 160,
      height: 60,
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    form: {
      flex: 1,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: 16,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
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
  });
