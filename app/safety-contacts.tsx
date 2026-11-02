import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Alert } from "@/components/GlobalAlert";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { emergencyContactsApi, getApiErrorMessage } from "@/services/api";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { RwandaPhoneInput } from "@/components/RwandaPhoneInput";
import { normalizeRwandaPhone } from "@/utils/rwandaPhone";

type Contact = { _id: string; name: string; phone: string; relationship?: string };

export default function Safety() {
  const { refreshAccount } = useAuth();
  const { colors } = useTheme();
  const t = useT();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => emergencyContactsApi.list().then((r) => setContacts(r.data.data)).catch((e) => Alert.alert(t("safety.load_failed"), getApiErrorMessage(e))).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);

  const add = async () => {
    const normalized = normalizeRwandaPhone(phone);
    if (!name.trim() || !normalized) return Alert.alert(t("safety.required"), t("safety.required_body"));
    setSaving(true);
    try {
      const res = await emergencyContactsApi.add({ name: name.trim(), phone: normalized, relationship: relationship.trim() || undefined });
      setContacts(res.data.data);
      setName(""); setPhone(""); setRelationship("");
      void refreshAccount().catch(() => {});
    } catch (e) { Alert.alert(t("safety.save_failed"), getApiErrorMessage(e)); }
    finally { setSaving(false); }
  };
  const remove = (c: Contact) => Alert.alert(t("safety.remove_q"), t("safety.remove_body", { name: c.name }), [
    { text: t("cancel"), style: "cancel" },
    { text: t("safety.remove"), style: "destructive", onPress: async () => {
      try { const res = await emergencyContactsApi.remove(c._id); setContacts(res.data.data); void refreshAccount().catch(() => {}); }
      catch (e) { Alert.alert(t("safety.remove_failed"), getApiErrorMessage(e)); }
    } },
  ]);

  const input = [styles.input, { color: colors.textPrimary, borderColor: colors.border }];
  return <PassengerSettingsScreen title={t("safety.title")}>
    <Text style={{ color: colors.textSecondary }}>{t("safety.intro")}</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : contacts.map((c) => (
      <View key={c._id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.backgroundCard }]}>
        <Feather name="shield" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>{c.name}{c.relationship ? ` · ${c.relationship}` : ""}</Text>
          <Text style={{ color: colors.textSecondary }}>{c.phone}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t("safety.remove")} ${c.name}`} onPress={() => remove(c)} style={{ padding: 8 }}><Feather name="trash-2" size={18} color={colors.error} /></TouchableOpacity>
      </View>
    ))}
    {contacts.length < 5 ? <>
      <TextInput style={input} value={name} onChangeText={setName} placeholder={t("safety.name")} placeholderTextColor={colors.textSecondary} />
      <RwandaPhoneInput value={phone} onChangeText={setPhone} accessibilityLabel={t("safety.phone")} />
      <TextInput style={input} value={relationship} onChangeText={setRelationship} placeholder={t("safety.relationship")} placeholderTextColor={colors.textSecondary} />
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} disabled={saving} onPress={add}><Text style={styles.buttonText}>{saving ? t("safety.saving") : t("safety.add")}</Text></TouchableOpacity>
    </> : null}
  </PassengerSettingsScreen>;
}
const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 14, padding: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  button: { padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontFamily: "Inter_700Bold" },
});
