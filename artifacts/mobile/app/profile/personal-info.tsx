import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usersApi } from "@/services/api";

export default function PersonalInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, login, token } = useAuth();
  const { colors } = useTheme();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    nationalId: user?.nationalId || "",
  });

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await usersApi.updateMe(form);
      const updated = res.data?.user || res.data;
      if (token && updated) await login(token, { ...user!, ...updated });
      setEditing(false);
      Alert.alert("Saved", "Your personal information has been updated.");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const s = styles(colors);

  const InfoRow = ({ label, field, keyboardType }: { label: string; field: keyof typeof form; keyboardType?: any }) => (
    <View style={s.infoRow}>
      <Text style={s.rowLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={s.rowInput}
          value={form[field]}
          onChangeText={(v) => update(field, v)}
          keyboardType={keyboardType || "default"}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
        />
      ) : (
        <Text style={s.rowValue}>{form[field] || "—"}</Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 8, paddingBottom: 40 }]}
    >
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Personal Information</Text>
        <TouchableOpacity
          style={s.editBtn}
          onPress={editing ? handleSave : () => setEditing(true)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={s.editBtnText}>{editing ? "Save" : "Edit"}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Avatar placeholder */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{form.firstName?.[0]}{form.lastName?.[0]}</Text>
        </View>
        <Text style={s.avatarName}>{form.firstName} {form.lastName}</Text>
      </View>

      <View style={s.card}>
        <InfoRow label="First Name" field="firstName" />
        <InfoRow label="Last Name" field="lastName" />
        <InfoRow label="Phone Number" field="phone" keyboardType="phone-pad" />
        <InfoRow label="Email" field="email" keyboardType="email-address" />
        <InfoRow label="National ID" field="nationalId" keyboardType="numeric" />
      </View>

      {editing && (
        <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditing(false); setForm({ firstName: user?.firstName||"", lastName: user?.lastName||"", email: user?.email||"", phone: user?.phone||"", nationalId: user?.nationalId||"" }); }}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: { paddingHorizontal: 16 },
    topBar: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
    backBtn: { padding: 4, marginRight: 12 },
    title: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: colors.textPrimary },
    editBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: `${colors.primary}18`, borderRadius: 20 },
    editBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primary },
    avatarSection: { alignItems: "center", marginBottom: 28 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    avatarText: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff" },
    avatarName: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textPrimary },
    card: { backgroundColor: colors.backgroundCard, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    infoRow: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
    rowValue: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textPrimary },
    rowInput: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 4 },
    cancelBtn: { marginTop: 16, alignItems: "center", padding: 12 },
    cancelText: { color: colors.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
