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
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, fetchRiderStatus } = useAuth();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();

  const logoSource = isDark
    ? require("@/assets/images/official-mota-white-logo-removebg-preview.png")
    : require("@/assets/images/official-mota-black-logo-removebg-preview.png");

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError("Please fill all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login({ identifier, password });
      const { token, user } = res.data || {};
      if (token && user) {
        await login(token, user);
        // Cache verification status for future login attempts
        await AsyncStorage.setItem(
          `verification_cache_${identifier}`,
          JSON.stringify({
            isVerified: user.isVerified,
            isEmailVerified: user.isEmailVerified,
            registrationStatus: user.registrationStatus,
            registrationPaid: user.registrationPaid,
            isActive: user.isActive,
            kycLevel: user.kycLevel,
            role: user.role,
            updatedAt: new Date().toISOString(),
          })
        );
        fetchRiderStatus();
        // Navigation is handled by RootLayoutNav in app/_layout.tsx based on user state
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        const errData = err.response?.data || {};

        // If the 403 response includes a token + user, the user is authenticated
        // but not fully active — log them in and let RootLayoutNav handle routing
        if (errData.token && errData.user) {
          await login(errData.token, errData.user);
          // Cache verification data
          await AsyncStorage.setItem(
            `verification_cache_${identifier}`,
            JSON.stringify({
              isVerified: errData.user.isVerified,
              isEmailVerified: errData.user.isEmailVerified,
              registrationStatus: errData.user.registrationStatus,
              registrationPaid: errData.user.registrationPaid,
              isActive: errData.user.isActive,
              kycLevel: errData.user.kycLevel,
              role: errData.user.role,
              updatedAt: new Date().toISOString(),
            })
          );
          fetchRiderStatus();
          return;
        }

        // Check cached verification data to avoid sending a verified user to confirm-phone
        let cachedVerification: any = null;
        try {
          const cached = await AsyncStorage.getItem(`verification_cache_${identifier}`);
          if (cached) cachedVerification = JSON.parse(cached);
        } catch {}

        // Determine if the user actually needs phone verification
        const responseUser = errData.user;
        const isAlreadyVerified =
          responseUser?.isVerified === true ||
          cachedVerification?.isVerified === true;

        if (isAlreadyVerified) {
          // User is already verified — the 403 is for another reason (isActive: false)
          setError(
            errData.message ||
            "Your account is verified but not yet active. Please contact support."
          );
        } else {
          // User genuinely needs phone verification
          router.push({
            pathname: "/(auth)/confirm-phone",
            params: {
              phone: errData.phone || identifier,
              userId: errData.userId,
            },
          });
        }
      } else {
        setError(err.response?.data?.message || t("error"));
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
        <TouchableOpacity style={s.themeToggle} onPress={toggleTheme}>
          <Feather name={isDark ? "sun" : "moon"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={s.header}>
          <Image source={logoSource} style={s.logo} resizeMode="contain" />
          <Text style={s.subtitle}>Move. Earn. Grow.</Text>
        </View>

        <View style={s.form}>
          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <View style={s.inputGroup}>
            <Text style={s.label}>Phone or Email</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. +250..."
              placeholderTextColor={colors.textTertiary}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <View style={s.passwordContainer}>
              <TextInput
                style={s.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={s.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={s.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>{t("login")}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 12 }} onPress={() => router.push('/(auth)/forgot-password' as any)}>
            <Text style={s.link}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={s.link}>{t("register")}</Text>
            </TouchableOpacity>
          </View>
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
    themeToggle: {
      alignSelf: "flex-end",
      padding: 8,
    },
    header: {
      alignItems: "center",
      marginTop: 20,
      marginBottom: 40,
    },
    logo: {
      width: 200,
      height: 80,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
      marginTop: 8,
    },
    form: {
      flex: 1,
    },
    inputGroup: {
      marginBottom: 20,
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
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    passwordInput: {
      flex: 1,
      padding: 16,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
    },
    eyeIcon: {
      padding: 16,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
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
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 32,
    },
    footerText: {
      color: colors.textSecondary,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
    },
    link: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
  });
