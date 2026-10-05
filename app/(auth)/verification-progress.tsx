import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { accountContinuation } from "@/services/accountContinuation";

export default function VerificationProgress() {
  const { user, refreshAccount, logout } = useAuth();
  const refreshAccountRef = useRef(refreshAccount);
  refreshAccountRef.current = refreshAccount;
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kycStatus, setKycStatus] = useState("not_submitted");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const account = await refreshAccountRef.current();
      setKycStatus(account.onboarding?.kycStatus || (account.kycLevel === "full" ? "approved" : "not_submitted"));
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not refresh verification status. Try again.");
    } finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const steps = [
    { title: "Phone number", done: !!user?.isVerified, detail: "Required for every account", route: "/(auth)/confirm-phone" },
    { title: "Email address", done: !!user?.isEmailVerified, detail: user?.email ? "Optional — verify when ready" : "Optional — add an email later", route: user?.email ? "/(auth)/verify-email" : undefined },
    { title: "Driver identity and vehicle", done: ["submitted", "approved"].includes(kycStatus), detail: kycStatus === "approved" ? "Approved" : kycStatus === "submitted" ? "Submitted for review" : user?.isVerified ? "Upload ID, selfie, licence and vehicle documents" : "Verify your phone before uploading documents", route: user?.isVerified ? "/(auth)/driver-kyc" : undefined },
    { title: "Registration fee", done: !!user?.registrationPaid, detail: "5,000 RWF via MoMo after KYC submission", route: ["submitted", "approved"].includes(kycStatus) ? "/(auth)/payment-registration" : undefined },
    { title: "Account activation", done: user?.kycLevel === "full" && !!user?.isActive, detail: user?.activationBlocked || (user?.registrationStatus === "approved" && !user?.isActive) ? "Account disabled — contact MOTA support" : "Approved full KYC activates your driver account automatically", route: undefined },
  ];

  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 }]}>
    <Feather name="check-square" size={36} color={colors.primary} />
    <Text style={[styles.title, { color: colors.textPrimary }]}>Finish driver setup</Text>
    <Text style={[styles.description, { color: colors.textSecondary }]}>Complete each required step to start receiving rides. You can finish email verification at any time.</Text>
    {error ? <Text style={{ color: colors.error, marginBottom: 12 }}>{error}</Text> : null}
    {steps.map((step, index) => <TouchableOpacity key={step.title} accessibilityRole="button" disabled={!step.route || step.done} onPress={() => router.push(step.route as any)} style={[styles.step, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      <View style={[styles.number, { backgroundColor: step.done ? colors.success : colors.primary }]}><Text style={styles.numberText}>{step.done ? "✓" : index + 1}</Text></View>
      <View style={{ flex: 1 }}><Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{step.title}</Text><Text style={{ color: colors.textSecondary }}>{step.detail}</Text></View>
      {step.route && !step.done ? <Feather name="chevron-right" size={20} color={colors.primary} /> : null}
    </TouchableOpacity>)}
    <TouchableOpacity onPress={() => void refresh()} style={[styles.button, { backgroundColor: colors.primary }]} disabled={refreshing}>
      {refreshing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Refresh status</Text>}
    </TouchableOpacity>
    <TouchableOpacity disabled={refreshing} onPress={async () => {
      setRefreshing(true);
      try { const account = await refreshAccountRef.current(); router.replace(accountContinuation(account) as any); }
      catch (e:any) { setError(e?.message || "Unable to check your account. Retry before continuing."); }
      finally { setRefreshing(false); }
    }} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={styles.buttonText}>{refreshing ? "Checking account…" : "Continue"}</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => void logout()} style={styles.secondary}><Text style={{ color: colors.textSecondary }}>Sign out</Text></TouchableOpacity>
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
