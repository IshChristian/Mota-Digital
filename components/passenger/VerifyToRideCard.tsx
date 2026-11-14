import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { kycApi } from "@/services/api";

export type VerificationNeeds = { email: boolean; identity: boolean };
const SUBMITTED = ["submitted", "approved", "correction"];

/**
 * Passengers confirm their email and submit their ID before booking (the backend enforces
 * the same rule with 403 VERIFY_TO_RIDE). Re-checks whenever the screen comes back into view.
 */
export function usePassengerVerification() {
  const { user, refreshAccount } = useAuth();
  const [identitySubmitted, setIdentitySubmitted] = useState<boolean | null>(null);
  const passenger = user?.role === "client" || user?.role === "passenger";
  // refreshAccount is a new function on every render; keep the latest in a ref so the
  // focus effect below doesn't re-run (and re-fetch) on every render.
  const refreshAccountRef = useRef(refreshAccount);
  refreshAccountRef.current = refreshAccount;

  const refresh = useCallback(async () => {
    if (!passenger) return;
    try { await refreshAccountRef.current(); } catch { /* keep the cached account */ }
    try {
      const res = await kycApi.getMine();
      setIdentitySubmitted(SUBMITTED.includes(res.data?.data?.status));
    } catch { setIdentitySubmitted(false); }
  }, [passenger]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const needs: VerificationNeeds | null = !passenger || identitySubmitted === null
    ? null
    : { email: user?.isEmailVerified !== true, identity: !identitySubmitted };
  return { needs, blocked: !!needs && (needs.email || needs.identity), refresh };
}

export function VerifyToRideCard({ needs }: { needs: VerificationNeeds }) {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const t = useT();
  const s = styles(colors);

  // No email yet → add one first (the confirmation code is sent to it); otherwise confirm it.
  const openEmail = () => user?.email
    ? router.push({ pathname: "/(auth)/verify-email", params: { email: user.email } } as any)
    : router.push("/contact-security" as any);
  const steps = [
    { key: "email", label: t("verify.email"), done: !needs.email, icon: "mail" as const, onPress: openEmail },
    { key: "identity", label: t("verify.identity"), done: !needs.identity, icon: "credit-card" as const, onPress: () => router.push("/(passenger)/profile/kyc" as any) },
  ];

  return (
    <View style={s.card} accessibilityRole="summary">
      <View style={s.head}>
        <Feather name="shield" size={20} color={colors.primary} />
        <Text style={s.title}>{t("verify.title")}</Text>
      </View>
      <Text style={s.body}>{t("verify.body")}</Text>
      {steps.map((step, i) => (
        <TouchableOpacity key={step.key} accessibilityRole="button" disabled={step.done} onPress={step.onPress} style={[s.step, step.done && s.stepDone]}>
          <View style={[s.num, step.done && { backgroundColor: colors.success }]}>
            {step.done ? <Feather name="check" size={14} color="#fff" /> : <Text style={s.numText}>{i + 1}</Text>}
          </View>
          <Feather name={step.icon} size={16} color={step.done ? colors.success : colors.textPrimary} />
          <Text style={[s.stepText, step.done && { color: colors.success }]}>{step.label}</Text>
          {step.done ? <Text style={[s.small, { color: colors.success }]}>{t("verify.done")}</Text> : <Feather name="chevron-right" size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    card: { gap: 10, padding: 16 },
    head: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { color: colors.textPrimary, fontSize: 18, fontFamily: "Inter_700Bold" },
    body: { color: colors.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
    step: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg },
    stepDone: { borderColor: `${colors.success}55` },
    num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    numText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
    stepText: { flex: 1, color: colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
    small: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  });
