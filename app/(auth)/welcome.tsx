import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { accountContinuation } from "@/services/accountContinuation";
import { Alert } from "@/components/GlobalAlert";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const t = useT();
  const router = useRouter();
  const { isAuthenticated, refreshAccount } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const logoSource = isDark
    ? require("@/assets/images/official-mota-black-logo-removebg-preview.png")
    : require("@/assets/images/official-mota-white-logo-removebg-preview.png");

  const handleSelectRole = (role: "driver" | "passenger") => {
    router.push({
      pathname: "/(auth)/register",
      params: { selectedRole: role },
    } as any);
  };

  const s = styles(colors, isDark);

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={s.header}>
        <Image source={logoSource} style={s.logo} resizeMode="contain" />
        <Text style={s.tagline}>{t("auth.tagline")}</Text>
      </View>

      <Text style={s.title}>{t("auth.choose_use")}</Text>

      {isAuthenticated ? <TouchableOpacity style={s.optionCard} onPress={async () => {
        try { const account = await refreshAccount(); router.replace(accountContinuation(account) as any); }
        catch (error:any) { Alert.alert(t("auth.check_failed"), error?.message || t("auth.retry_first")); }
      }}><Text style={s.optionTitle}>{t("auth.continue_account")}</Text></TouchableOpacity> : null}
      <View style={s.optionsContainer}>
        {/* Passenger Option */}
        <TouchableOpacity
          style={s.optionCard}
          onPress={() => handleSelectRole("passenger")}
          activeOpacity={0.8}
        >
          <View style={[s.iconBg, { backgroundColor: `${colors.primary}12` }]}>
            <Feather name="navigation" size={32} color={colors.primary} />
          </View>
          <View style={s.optionTextContent}>
            <Text style={s.optionTitle}>{t("auth.rider_passenger")}</Text>
            <Text style={s.optionDesc}>
              {t("auth.rider_desc")}
            </Text>
          </View>
          <Feather name="arrow-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Driver Option */}
        <TouchableOpacity
          style={s.optionCard}
          onPress={() => handleSelectRole("driver")}
          activeOpacity={0.8}
        >
          <View style={[s.iconBg, { backgroundColor: "#10B98112" }]}>
            <Feather name="truck" size={32} color="#10B981" />
          </View>
          <View style={s.optionTextContent}>
            <Text style={s.optionTitle}>{t("auth.moto_driver")}</Text>
            <Text style={s.optionDesc}>
              {t("auth.driver_desc")}
            </Text>
          </View>
          <Feather name="arrow-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={s.footer}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/onboarding" as any)}
          >
            <Text style={s.loginLink}>{t("auth.how_it_works")}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row" }}>
            <Text style={s.footerText}>{t("auth.have_account")} </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={s.loginLink}>{t("auth.log_in")}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: 18 }}>
            <TouchableOpacity
              onPress={() => router.push("/info/privacy" as any)}
            >
              <Text style={s.footerText}>{t("auth.privacy")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/info/terms" as any)}>
              <Text style={s.footerText}>{t("auth.terms")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      justifyContent: "space-between",
    },
    header: {
      alignItems: "center",
      marginTop: 40,
    },
    logo: {
      width: 180,
      height: 70,
    },
    tagline: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
      marginTop: 4,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    title: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      textAlign: "center",
      marginVertical: 20,
    },
    optionsContainer: {
      gap: 16,
      flex: 1,
      justifyContent: "center",
    },
    optionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    iconBg: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    optionTextContent: {
      flex: 1,
      marginRight: 8,
    },
    optionTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    optionDesc: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 18,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 20,
    },
    footerText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    loginLink: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
  });
