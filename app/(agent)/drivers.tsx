import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { agentApi, getApiErrorMessage } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { normalizeRwandaPhone } from "@/utils/rwandaPhone";

type Driver = { _id: string; firstName: string; lastName: string; phone: string; registrationStatus?: string; isActive?: boolean };
export default function AgentDrivers() {
  const { colors } = useTheme();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", nationalId: "" });
  const [request, setRequest] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try { const response = await agentApi.drivers(); setDrivers(response.data.drivers || []); }
    catch (e) { setMessage(getApiErrorMessage(e)); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
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
    try { await agentApi.requestDriverUpdate(id, request[id]); setRequest((current) => ({ ...current, [id]: "" })); setMessage("Update request sent for administrator review."); }
    catch (e) { setMessage(getApiErrorMessage(e)); } finally { setBusy(false); }
  };
  const inputStyle = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderRadius: 12, padding: 13 };
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingTop: 55, paddingBottom: 110, gap: 12 }} keyboardShouldPersistTaps="handled">
    <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: "700" }}>My drivers</Text>
    {message ? <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{message}</Text> : null}
    <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "600" }}>Start a registration</Text>
    {(["firstName", "lastName", "phone", "nationalId"] as const).map((key) => <TextInput key={key} accessibilityLabel={key} placeholder={key === "nationalId" ? "National ID" : key === "phone" ? "Phone number" : key === "firstName" ? "First name" : "Last name"} placeholderTextColor={colors.textSecondary} style={inputStyle} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} />)}
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => Alert.alert("Submit registration", "The driver must verify their phone and complete administrator review before driving.", [{ text: "Cancel", style: "cancel" }, { text: "Submit", onPress: () => void register() }])} style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 15 }}><Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Register driver</Text></TouchableOpacity>
    <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginTop: 18 }}>Registered drivers</Text>
    {drivers.length === 0 ? <Text style={{ color: colors.textSecondary }}>No drivers registered yet.</Text> : drivers.map((driver) => <View key={driver._id} style={{ backgroundColor: colors.backgroundCard, borderRadius: 16, padding: 16, gap: 9 }}>
      <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{driver.firstName} {driver.lastName}</Text>
      <Text style={{ color: colors.textSecondary }}>{driver.phone} · {driver.registrationStatus || (driver.isActive ? "Active" : "Pending review")}</Text>
      <TextInput accessibilityLabel={`Requested update for ${driver.firstName}`} multiline placeholder="Describe a change for administrator review" placeholderTextColor={colors.textSecondary} style={inputStyle} value={request[driver._id] || ""} onChangeText={(value) => setRequest((current) => ({ ...current, [driver._id]: value }))} />
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void sendRequest(driver._id)}><Text style={{ color: colors.primary, fontWeight: "700" }}>Request update</Text></TouchableOpacity>
    </View>)}
  </ScrollView>;
}
