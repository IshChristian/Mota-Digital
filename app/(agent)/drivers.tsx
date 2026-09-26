import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { agentApi, getApiErrorMessage } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { normalizeRwandaPhone } from "@/utils/rwandaPhone";

type Driver = { _id: string; firstName: string; lastName: string; phone: string; registrationStatus?: string; registrationPaid?: boolean; isActive?: boolean; isVerified?: boolean; kyc?: { status: string; remarks?: string } | null };
type Request = { _id: string; driverId: string; subject: string; status: string; resolution?: string; createdAt: string };
const assistance = { profile_update: "Profile update", kyc_help: "KYC assistance", fee_help: "Fee assistance", account_access: "Account access" } as const;
export default function AgentDrivers() {
  const { colors } = useTheme();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", nationalId: "" });
  const [request, setRequest] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<Record<string, keyof typeof assistance>>({});
  const [history, setHistory] = useState<Request[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try { const [response, requests] = await Promise.all([agentApi.drivers(), agentApi.updateRequests()]); setDrivers(response.data.drivers || []); setHistory(requests.data.data || []); setMessage(""); }
    catch (e) { setMessage(getApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const refresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };
  const register = async () => {
    const phone = normalizeRwandaPhone(form.phone);
    if (!phone || !form.firstName.trim() || !form.lastName.trim() || !form.nationalId.trim()) { setMessage("Enter a name, valid phone number and national ID."); return; }
    setBusy(true);
    try { await agentApi.registerDriver({ ...form, phone }); setMessage("Registration sent. Verification and administrator review are required."); setForm({ firstName: "", lastName: "", phone: "", nationalId: "" }); await load(); }
    catch (e) { setMessage(getApiErrorMessage(e)); } finally { setBusy(false); }
  };
  const sendRequest = async (id: string) => {
    if ((request[id] || "").trim().length < 10) { setMessage("Describe the requested change in at least 10 characters."); return; }
    setBusy(true);
    try { await agentApi.requestDriverUpdate(id, request[id], kind[id] || "profile_update"); setRequest((current) => ({ ...current, [id]: "" })); setMessage("Assistance request sent for administrator review."); await load(); }
    catch (e) { setMessage(getApiErrorMessage(e)); } finally { setBusy(false); }
  };
  const inputStyle = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderRadius: 12, padding: 13 };
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 55, paddingBottom: 110, gap: 12 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
    <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: "700" }}>My drivers</Text>
    {message ? <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{message}</Text> : null}
    <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "600" }}>Start a registration</Text>
    {(["firstName", "lastName", "phone", "nationalId"] as const).map((key) => <TextInput key={key} accessibilityLabel={key} placeholder={key === "nationalId" ? "National ID" : key === "phone" ? "Phone number" : key === "firstName" ? "First name" : "Last name"} placeholderTextColor={colors.textSecondary} style={inputStyle} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} />)}
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => Alert.alert("Submit registration", "The driver must verify their phone and complete administrator review before driving.", [{ text: "Cancel", style: "cancel" }, { text: "Submit", onPress: () => void register() }])} style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 15 }}><Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Register driver</Text></TouchableOpacity>
    <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginTop: 18 }}>Registered drivers</Text>
    {loading ? <Text style={{ color: colors.textSecondary }}>Loading drivers…</Text> : drivers.length === 0 && !message ? <Text style={{ color: colors.textSecondary }}>No drivers registered yet.</Text> : drivers.map((driver) => <View key={driver._id} style={{ backgroundColor: colors.backgroundCard, borderRadius: 16, padding: 16, gap: 9 }}>
      <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{driver.firstName} {driver.lastName}</Text>
      <Text style={{ color: colors.textSecondary }}>{driver.phone} · {driver.registrationStatus || (driver.isActive ? "Active" : "Pending review")}</Text>
      <Text style={{ color: colors.textSecondary }}>Phone: {driver.isVerified ? "verified" : "verification needed"} · KYC: {driver.kyc?.status || "not submitted"}</Text>
      {driver.kyc?.remarks ? <Text style={{ color: colors.textSecondary }}>Review note: {driver.kyc.remarks}</Text> : null}
      <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Ask the admin to help with</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(Object.entries(assistance) as [keyof typeof assistance, string][]).map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: (kind[driver._id] || "profile_update") === value }} onPress={() => setKind((current) => ({ ...current, [driver._id]: value }))} style={{ borderColor: (kind[driver._id] || "profile_update") === value ? colors.primary : colors.border, borderWidth: 1, padding: 9, borderRadius: 10 }}><Text style={{ color: colors.textPrimary }}>{label}</Text></TouchableOpacity>)}</View>
      <TextInput accessibilityLabel={`Requested update for ${driver.firstName}`} multiline placeholder="Describe a change for administrator review" placeholderTextColor={colors.textSecondary} style={inputStyle} value={request[driver._id] || ""} onChangeText={(value) => setRequest((current) => ({ ...current, [driver._id]: value }))} />
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void sendRequest(driver._id)}><Text style={{ color: colors.primary, fontWeight: "700" }}>Send to admin</Text></TouchableOpacity>
      {history.filter((item) => String(item.driverId) === driver._id).slice(0, 5).map((item) => <View key={item._id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}><Text style={{ color: colors.textPrimary }}>{item.subject} · {item.status}</Text>{item.resolution ? <Text style={{ color: colors.textSecondary }}>{item.resolution}</Text> : null}</View>)}
    </View>)}
  </ScrollView>;
}
