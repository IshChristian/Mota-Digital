import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { translate, useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { accountContinuation } from "@/services/accountContinuation";
import { rwf, usePricing } from "@/hooks/usePricing";

export default function VerificationProgress() {
  const t = useT();
  const { pricing } = usePricing();
  const { user, refreshAccount, logout } = useAuth();
  const refreshAccountRef = useRef(refreshAccount);
  refreshAccountRef.current = refreshAccount;
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kycStatus, setKycStatus] = useState("not_submitted");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    // The root layout then sends a signed-out person to the sign-in page.
    try { await logout(); } finally { setSigningOut(false); }
  };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const account = await refreshAccountRef.current();
      setKycStatus(account.onboarding?.kycStatus || (account.kycLevel === "full" ? "approved" : "not_submitted"));
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.message || translate("setup.refresh_failed"));
    } finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const kycDetail: Record<string, string> = { approved: t("setup.approved"), submitted: t("setup.submitted"), correction: t("setup.correction"), rejected: t("setup.rejected") };
  // Submitted is not approved: only a staff approval earns the green tick.
  const kycSent = ["submitted", "approved"].includes(kycStatus);
  const steps = [
    { title: t("setup.email"), done: !!user?.isEmailVerified, waiting: false, detail: user?.isEmailVerified ? user.email : user?.email ? t("setup.email_ready") : t("setup.email_add"), route: user?.email ? "/(auth)/verify-email" : undefined },
    { title: t("setup.kyc"), done: kycStatus === "approved", waiting: kycStatus === "submitted", detail: kycDetail[kycStatus] || t("setup.upload"), route: "/(auth)/driver-kyc" },
    { title: t("setup.fee"), done: !!user?.registrationPaid, waiting: false, detail: user?.registrationPaid ? t("setup.fee_paid") : t("setup.fee_detail", { amount: rwf(pricing.registrationFee.driver) }), route: kycSent ? "/(auth)/payment-registration" : undefined },
    { title: t("setup.activation"), done: kycStatus === "approved" && user?.kycLevel === "full" && !!user?.isActive && !!user?.registrationPaid, waiting: false, detail: user?.activationBlocked || (user?.registrationStatus === "approved" && !user?.isActive) ? t("setup.disabled") : kycStatus === "approved" && user?.isActive && user?.registrationPaid ? t("setup.active") : t("setup.activation_wait"), route: undefined },
  ];

  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 }]}>
    <Feather name="check-square" size={36} color={colors.primary} />
    <Text style={[styles.title, { color: colors.textPrimary }]}>{t("setup.title")}</Text>
    <Text style={[styles.description, { color: colors.textSecondary }]}>{t("setup.body")}</Text>
    {error ? <Text style={{ color: colors.error, marginBottom: 12 }}>{error}</Text> : null}
    {steps.map((step, index) => <TouchableOpacity key={step.title} accessibilityRole="button" disabled={!step.route || step.done} onPress={() => router.push(step.route as any)} style={[styles.step, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      <View style={[styles.number, { backgroundColor: step.done ? colors.success : step.waiting ? "#B45309" : colors.primary }]}><Text style={styles.numberText}>{step.done ? "✓" : step.waiting ? "…" : index + 1}</Text></View>
      <View style={{ flex: 1 }}><Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{step.title}</Text><Text style={{ color: colors.textSecondary }}>{step.detail}</Text></View>
      {step.route && !step.done ? <Feather name="chevron-right" size={20} color={colors.primary} /> : null}
    </TouchableOpacity>)}
    <TouchableOpacity onPress={() => void refresh()} style={[styles.button, { backgroundColor: colors.primary }]} disabled={refreshing}>
      {refreshing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("setup.refresh")}</Text>}
    </TouchableOpacity>
    <TouchableOpacity disabled={refreshing} onPress={async () => {
      setRefreshing(true);
      try { const account = await refreshAccountRef.current(); router.replace(accountContinuation(account) as any); }
      catch (e:any) { setError(e?.message || "Unable to check your account. Retry before continuing."); }
      finally { setRefreshing(false); }
    }} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={styles.buttonText}>{refreshing ? t("setup.checking") : t("setup.continue")}</Text></TouchableOpacity>
    <TouchableOpacity disabled={signingOut} onPress={signOut} style={styles.secondary}><Text style={{ color: colors.textSecondary }}>{t("setup.sign_out")}</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, gap: 12 }, title: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 8 },
  description: { fontSize: 14, lineHeight: 22, marginBottom: 10 },
  step: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }, numberText: { color: "#fff", fontFamily: "Inter_700Bold" },
  stepTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 4 },
  button: { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 12 }, buttonText: { color: "#fff", fontFamily: "Inter_700Bold" },
  secondary: { alignItems: "center", padding: 14 },
});
