import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usersApi } from "@/services/api";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { RwandaPhoneInput } from "@/components/RwandaPhoneInput";
import { normalizeRwandaPhone } from "@/utils/rwandaPhone";

export default function Safety() {
  const { user, refreshUser } = useAuth() as any;
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setName(user?.emergencyContactName || ""); setPhone(user?.emergencyContactPhone || ""); }, [user]);
  const save = async () => {
    const normalizedPhone = normalizeRwandaPhone(phone);
    if (!name.trim() || !normalizedPhone) return Alert.alert("Required", "Add a contact name and a valid Rwanda phone number.");
    setSaving(true);
    try {
      await usersApi.updateMe({ emergencyContactName: name.trim(), emergencyContactPhone: normalizedPhone });
      await refreshUser?.();
      Alert.alert("Saved", "Emergency contact updated.");
    } catch (error: any) { Alert.alert("Unable to save", error?.response?.data?.message || "Please try again."); }
    finally { setSaving(false); }
  };
  return <PassengerSettingsScreen title="Safety">
    <Text style={{ color: colors.textSecondary }}>This contact can be used by support during an active ride emergency.</Text>
    <TextInput style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} value={name} onChangeText={setName} placeholder="Emergency contact name" placeholderTextColor={colors.textSecondary} />
    <RwandaPhoneInput value={phone} onChangeText={setPhone} accessibilityLabel="Emergency contact phone number" />
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} disabled={saving} onPress={save}><Text style={styles.buttonText}>{saving ? "Saving…" : "Save safety contact"}</Text></TouchableOpacity>
  </PassengerSettingsScreen>;
}
const styles = StyleSheet.create({ input: { borderWidth: 1, borderRadius: 14, padding: 15 }, button: { padding: 16, borderRadius: 14, alignItems: "center" }, buttonText: { color: "#fff", fontFamily: "Inter_700Bold" } });
