import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usersApi, driverApi } from "@/services/api";
import { AppAlert } from "@/components/AppAlert";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import Colors from "@/constants/colors";

export default function PersonalInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, login, token } = useAuth();
  const { colors } = useTheme();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });

  const [alert, setAlert] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ visible: false, type: "success", title: "" });

  // Fetch fresh user data
  const { data: profileData, isLoading: userLoading } = useQuery({
    queryKey: ["my_profile"],
    queryFn: async () => {
      const res = await usersApi.getMe();
      return res.data?.user || res.data;
    },
  });

  // Fetch driver profile for plate & tier info
  const { data: driverProfile, isLoading: driverLoading } = useQuery({
    queryKey: ["driver_profile"],
    queryFn: async () => {
      const res = await driverApi.getProfile();
      return res.data?.profile || res.data;
    },
  });

  const isLoading = userLoading || driverLoading;

  useEffect(() => {
    const src = profileData || user;
    if (src) {
      setForm({
        firstName: src.firstName || "",
        lastName: src.lastName || "",
        email: src.email || "",
      });
    }
  }, [profileData, user]);

  const update = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await usersApi.updateMe(form);
      const updated = res.data?.user || res.data;
      if (token && updated) {
        await login(token, { ...user!, ...updated });
      }
      setEditing(false);
      setAlert({ visible: true, type: "success", title: "Saved!", message: "Your profile has been updated." });
    } catch (err: any) {
      setAlert({ visible: true, type: "error", title: "Error", message: err.response?.data?.message || "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setAlert({ visible: true, type: "error", title: "Permission needed", message: "Please allow access to your photo library." });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setUploadingAvatar(true);

      const updated = await usersApi.uploadAvatar(asset.uri);
      if (user && token) {
        await login(token, {
          ...user,
          avatarUrl: updated.avatarUrl,
        });
      }
      setAlert({ visible: true, type: "success", title: "Success", message: "Your profile photo has been updated." });
    } catch (err: any) {
      setAlert({ visible: true, type: "error", title: "Error", message: err.message || "Could not upload profile photo." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    const src = profileData || user;
    if (src) setForm({ firstName: src.firstName || "", lastName: src.lastName || "", email: src.email || "" });
  };

  const s = styles(colors);
  const src = profileData || user;

  const Field = ({
    label,
    value,
    field,
    keyboard,
    editable = true,
  }: {
    label: string;
    value: string;
    field?: keyof typeof form;
    keyboard?: any;
    editable?: boolean;
  }) => (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {editing && editable && field ? (
        <TextInput
          style={s.fieldInput}
          value={form[field]}
          onChangeText={(v) => update(field, v)}
          keyboardType={keyboard || "default"}
          autoCapitalize="none"
          placeholderTextColor={colors.textTertiary}
        />
      ) : (
        <Text style={[s.fieldValue, !value && s.fieldEmpty]}>
          {value || "—"}
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 8, paddingBottom: 48 }]}
    >
      {/* Header */}
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

      {isLoading && !src ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* Avatar area */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={handleAvatarChange} disabled={uploadingAvatar}>
              <View style={s.avatar}>
                {user?.avatarUrl || src?.avatarUrl || src?.profileImage ? (
                  <Image source={{ uri: user?.avatarUrl || src?.avatarUrl || src?.profileImage }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                ) : (
                  <Text style={s.avatarText}>
                    {form.firstName?.[0]}{form.lastName?.[0]}
                  </Text>
                )}
                {uploadingAvatar && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 40, justifyContent: "center", alignItems: "center" }]}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
                <View style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: colors.secondary, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.background }}>
                   <Feather name="camera" size={12} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={s.fullName}>{form.firstName} {form.lastName}</Text>
            {src?.tier && (
              <View style={[s.tierChip, { borderColor: (Colors.tier as any)[src.tier?.toLowerCase()] || colors.primary }]}>
                <Feather name="award" size={13} color={(Colors.tier as any)[src.tier?.toLowerCase()] || colors.primary} />
                <Text style={[s.tierText, { color: (Colors.tier as any)[src.tier?.toLowerCase()] || colors.primary }]}>
                  {src.tier?.toUpperCase()} TIER
                </Text>
              </View>
            )}
          </View>

          {/* Editable Info */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Account Details</Text>
            <Field label="First Name" value={form.firstName} field="firstName" editable />
            <Field label="Last Name" value={form.lastName} field="lastName" editable />
            <Field label="Email" value={form.email} field="email" keyboard="email-address" editable />
            <Field label="Phone" value={src?.phone || ""} editable={false} />
            <Field label="National ID" value={src?.nationalId || driverProfile?.nid || ""} editable={false} />
          </View>

          {/* Verification Status */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Verification Status</Text>
            <View style={s.statusRow}>
              <View style={s.statusItem}>
                <Feather
                  name={src?.isVerified ? "check-circle" : "clock"}
                  size={16}
                  color={src?.isVerified ? colors.success : colors.textTertiary}
                />
                <Text style={[s.statusLabel, { color: src?.isVerified ? colors.success : colors.textTertiary }]}>
                  Phone {src?.isVerified ? "Verified" : "Pending"}
                </Text>
              </View>
              <View style={s.statusItem}>
                <Feather
                  name={src?.isEmailVerified ? "check-circle" : "clock"}
                  size={16}
                  color={src?.isEmailVerified ? colors.success : colors.textTertiary}
                />
                <Text style={[s.statusLabel, { color: src?.isEmailVerified ? colors.success : colors.textTertiary }]}>
                  Email {src?.isEmailVerified ? "Verified" : "Pending"}
                </Text>
              </View>
            </View>
          </View>

          {/* Driver Details */}
          {driverProfile && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Driver Details</Text>
              <Field label="Plate Number" value={driverProfile?.plateNumber || ""} editable={false} />
              <Field label="Cooperative" value={driverProfile?.cooperativeName || ""} editable={false} />
              <Field label="Status" value={driverProfile?.status || "Active"} editable={false} />
              {src?.referralCode && (
                <Field label="Referral Code" value={src.referralCode} editable={false} />
              )}
            </View>
          )}

          {editing && (
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <AppAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={() => setAlert((a) => ({ ...a, visible: false }))}
      />
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
    avatarSection: { alignItems: "center", marginBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
    avatarText: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff" },
    fullName: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.textPrimary, marginBottom: 8 },
    tierChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
    tierText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
    card: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      padding: 16,
    },
    cardTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
    field: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
    fieldValue: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textPrimary },
    fieldEmpty: { color: colors.textTertiary, fontStyle: "italic" },
    fieldInput: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.textPrimary, borderBottomWidth: 1.5, borderBottomColor: colors.primary, paddingBottom: 4 },
    statusRow: { flexDirection: "row", gap: 24 },
    statusItem: { flexDirection: "row", alignItems: "center", gap: 8 },
    statusLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
    cancelBtn: { marginTop: 8, alignItems: "center", padding: 14 },
    cancelText: { color: colors.textSecondary, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
