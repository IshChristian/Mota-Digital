import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usersApi } from "@/services/api";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";

export default function PersonalInfo() {
  const router = useRouter();
  const { user, refreshUser } = useAuth() as any;
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setFirstName(user?.firstName || ""); setLastName(user?.lastName || ""); }, [user]);
  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) return Alert.alert("Required", "Complete both name fields.");
    setSaving(true);
    try {
      await usersApi.updateMe({ firstName: firstName.trim(), lastName: lastName.trim() });
      await refreshUser?.();
      Alert.alert("Saved", "Personal information updated.");
    } catch (error: any) { Alert.alert("Unable to save", error?.response?.data?.message || "Please try again."); }
    finally { setSaving(false); }
  };
  const input = [styles.input, { color: colors.textPrimary, borderColor: colors.border }];
  return <PassengerSettingsScreen title="Personal information">
    <TextInput style={input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={colors.textSecondary} />
    <TextInput style={input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={colors.textSecondary} />
    <Text style={[styles.label, { color: colors.textSecondary }]}>Verified phone</Text>
    <Text style={[styles.verified, { color: colors.textPrimary, backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>{user?.phone || "Not set"}</Text>
    <TouchableOpacity style={[styles.outline, { borderColor: colors.primary }]} onPress={() => router.push("/contact-security" as any)}><Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>Change verified phone securely</Text></TouchableOpacity>
    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} disabled={saving} onPress={save}><Text style={styles.buttonText}>{saving ? "Saving…" : "Save changes"}</Text></TouchableOpacity>
  </PassengerSettingsScreen>;
}
const styles = StyleSheet.create({ input: { borderWidth: 1, borderRadius: 14, padding: 15 }, label: { fontSize: 12, fontFamily: "Inter_600SemiBold" }, verified: { borderWidth: 1, borderRadius: 14, padding: 15, fontFamily: "Inter_600SemiBold" }, outline: { borderWidth: 1, padding: 14, borderRadius: 14, alignItems: "center" }, button: { padding: 16, borderRadius: 14, alignItems: "center" }, buttonText: { color: "#fff", fontFamily: "Inter_700Bold" } });
