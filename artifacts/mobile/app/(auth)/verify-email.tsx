import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();

  const email = params.email || user?.email || "your email";

  const handleContinue = async () => {
    // In a real app we'd verify the email token from a deep link or OTP input
    await updateUser({ isEmailVerified: true });
  };

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.iconWrap}>
        <Feather name="mail" size={48} color={colors.primary} />
      </View>

      <Text style={s.title}>Verify Your Email</Text>
      <Text style={s.subtitle}>
        We sent a verification link to{"\n"}
        <Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
        {"\n\n"}
        Please check your inbox and click the link to verify your email address.
      </Text>

      <View style={s.infoBox}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={s.infoText}>
          Check your spam folder if you don't see the email within a few minutes.
        </Text>
      </View>

      <TouchableOpacity
        style={s.button}
        onPress={handleContinue}
      >
        <Text style={s.buttonText}>Continue Setup →</Text>
      </TouchableOpacity>

      <Text style={s.note}>
        You can continue setup now. Email verification can be completed later.
      </Text>
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
    infoBox: {
      flexDirection: "row",
      backgroundColor: `${colors.primary}12`,
      borderRadius: 12,
      padding: 16,
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 32,
      width: "100%",
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 20,
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
    note: {
      marginTop: 16,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      textAlign: "center",
    },
  });
