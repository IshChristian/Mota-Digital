import { useEffect, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { agentApi, getApiErrorMessage } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export default function AgentHome() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { agentApi.stats().then((response) => setStats(response.data)).catch((e) => setError(getApiErrorMessage(e))); }, []);
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 18 }}>
    <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700" }}>Welcome, {user?.firstName || "Agent"}</Text>
    <Text style={{ color: colors.textSecondary }}>Manage registrations and request driver account changes.</Text>
    {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
    <View style={{ backgroundColor: colors.backgroundCard, borderRadius: 18, padding: 20, gap: 10 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Driver registrations</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 32, fontWeight: "700" }}>{stats?.totalRegistered ?? "—"}</Text>
      <Text style={{ color: colors.textSecondary }}>{stats?.pendingReferrals ?? "—"} pending referrals</Text>
    </View>
    <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(agent)/drivers" as any)} style={{ backgroundColor: colors.primary, padding: 18, borderRadius: 14 }}><Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Manage my drivers</Text></TouchableOpacity>
  </ScrollView>;
}
