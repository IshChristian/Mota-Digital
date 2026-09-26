import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/context/AuthContext";
import { useT, useI18n } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { usersApi } from "@/services/api";
import { AppAlert } from "@/components/AppAlert";
import { DriverHeader } from "@/components/driver/DriverUI";

export default function ProfileScreen() {
  const { user, logout, login, token } = useAuth();
  const { language, setLanguage } = useI18n();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [langModal, setLangModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // AppAlert state
  const [alert, setAlert] = useState<{
    visible: boolean;
    type: "success" | "error" | "warning" | "info" | "confirm";
    title: string;
    message?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({ visible: false, type: "info", title: "" });

  const showAlert = (
    type: typeof alert.type,
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string,
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
      onConfirm: () => {
        setAlert((a) => ({ ...a, visible: false }));
        onConfirm?.();
      },
      onCancel: () => {
        setAlert((a) => ({ ...a, visible: false }));
        onCancel?.();
      },
      confirmText,
      cancelText,
    });
  };

  const handleLogout = () => {
    showAlert(
      "confirm",
      "Logout",
      "Are you sure you want to logout?",
      logout,
      undefined,
      "Logout",
      "Cancel",
    );
  };

  const handleAvatarChange = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "warning",
          "Permission needed",
          "Please allow access to your photo library.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setAvatarUploading(true);

      // Use backend's multipart avatar endpoint
      const updated = await usersApi.uploadAvatar(asset.uri);
      if (user && token) {
        await login(token, {
          ...user,
          avatarUrl: updated.avatarUrl,
        });
      }
      showAlert(
        "success",
        "Photo Updated",
        "Your profile photo has been updated.",
      );
    } catch (err: any) {
      showAlert(
        "error",
        "Upload Failed",
        err.message || "Could not upload profile photo. Please try again.",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const langOptions = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
  ] as const;

  const s = styles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DriverHeader
          title={t("profile")}
          subtitle="Account, vehicle, verification, and app preferences."
          action={
            <TouchableOpacity
              accessibilityLabel="Change appearance"
              onPress={toggleTheme}
              style={s.themeBtn}
            >
              <Feather
                name={isDark ? "sun" : "moon"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          }
        />

        {/* Avatar */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            {user?.avatarUrl || user?.profileImage ? (
              <Image source={{ uri: user.avatarUrl || user.profileImage }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarText}>
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={s.cameraBtn}
              onPress={handleAvatarChange}
              disabled={avatarUploading}
              accessibilityLabel="Change profile photo"
            >
              {avatarUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="camera" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={s.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={s.phone}>{user?.phone}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>
              {user?.role?.toUpperCase() || "DRIVER"}
            </Text>
          </View>
        </View>

        {/* Account */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={s.row}
            onPress={() => router.push("/profile/personal-info")}
          >
            <View style={s.rowIcon}>
              <Feather name="user" size={18} color={colors.primary} />
            </View>
            <Text style={s.rowText}>Personal Information</Text>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={s.row} onPress={() => setLangModal(true)}>
            <View style={s.rowIcon}>
              <Feather name="globe" size={18} color={colors.primary} />
            </View>
            <View style={s.rowBody}>
              <Text style={s.rowText}>Language</Text>
              <Text style={s.rowSub}>
                {langOptions.find((l) => l.code === language)?.flag}{" "}
                {langOptions.find((l) => l.code === language)?.label}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={s.row} onPress={toggleTheme}>
            <View style={s.rowIcon}>
              <Feather
                name={isDark ? "moon" : "sun"}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={s.rowBody}>
              <Text style={s.rowText}>Appearance</Text>
              <Text style={s.rowSub}>
                {isDark ? "Dark Mode" : "Light Mode"}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Driver Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Driver Details</Text>
          <TouchableOpacity
            style={s.row}
            onPress={() => router.push("/(driver)/finance" as any)}
          >
            <View style={s.rowIcon}>
              <Feather name="bar-chart-2" size={18} color={colors.primary} />
            </View>
            <Text style={s.rowText}>Driver Finance</Text>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.row}
            onPress={() => router.push("/(driver)/kyc" as any)}
          >
            <View style={s.rowIcon}>
              <Feather name="shield" size={18} color={colors.primary} />
            </View>
            <Text style={s.rowText}>Driver Verification</Text>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.row}
            onPress={() => router.push("/security" as any)}
          >
            <View style={s.rowIcon}>
              <Feather name="lock" size={18} color={colors.primary} />
            </View>
            <Text style={s.rowText}>Security & Account</Text>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.row}
            onPress={() => router.push("/profile/vehicle-info")}
          >
            <View style={s.rowIcon}>
              <Feather name="truck" size={18} color={colors.primary} />
            </View>
            <Text style={s.rowText}>Vehicle Information</Text>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.row}
            onPress={() => router.push("/profile/documents")}
          >
            <View style={s.rowIcon}>
              <Feather name="file-text" size={18} color={colors.primary} />
            </View>
            <Text style={s.rowText}>Documents & Permits</Text>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {[
            ["search", "Search MOTA", "/search"],
            ["help-circle", "Help Center", "/info/help"],
            ["phone", "Contact MOTA", "/info/contact"],
            ["shield", "Privacy Policy", "/info/privacy"],
            ["file-text", "Terms of Service", "/info/terms"],
          ].map(([icon, label, path]) => (
            <TouchableOpacity
              key={label}
              style={s.row}
              onPress={() => router.push(path as any)}
            >
              <View style={s.rowIcon}>
                <Feather name={icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={s.rowText}>{label}</Text>
              <Feather
                name="chevron-right"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={colors.error} />
          <Text style={s.logoutText}>{t("logout")}</Text>
        </TouchableOpacity>

        <Text style={s.version}>MOTA — Rider's Best Friend v1.0.0</Text>
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={langModal}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Choose Language</Text>
            {langOptions.map((opt) => (
              <TouchableOpacity
                key={opt.code}
                style={[s.langRow, language === opt.code && s.langRowActive]}
                onPress={() => {
                  setLanguage(opt.code);
                  setLangModal(false);
                }}
              >
                <Text style={s.langFlag}>{opt.flag}</Text>
                <Text
                  style={[
                    s.langLabel,
                    language === opt.code && s.langLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {language === opt.code && (
                  <Feather name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* AppAlert */}
      <AppAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
      />
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 16 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    themeBtn: { padding: 8 },
    profileCard: {
      alignItems: "center",
      paddingVertical: 28,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    avatarWrap: { position: "relative", marginBottom: 14 },
    avatarImg: { width: 88, height: 88, borderRadius: 44 },
    avatarPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff" },
    cameraBtn: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.background,
    },
    name: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    phone: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginBottom: 10,
    },
    badge: {
      backgroundColor: colors.backgroundElevated,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
    },
    badgeText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 1,
    },
    section: { paddingTop: 20, marginBottom: 4 },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    rowBody: { flex: 1 },
    rowText: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.textPrimary,
    },
    rowSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginTop: 2,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
      marginTop: 24,
      backgroundColor: `${colors.error}12`,
      borderRadius: 12,
      gap: 8,
    },
    logoutText: {
      color: colors.error,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    version: {
      textAlign: "center",
      color: colors.textTertiary,
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      marginTop: 20,
    },
    // Language modal
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.backgroundCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 20,
    },
    langRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    langRowActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    langFlag: { fontSize: 24, marginRight: 14 },
    langLabel: {
      flex: 1,
      fontSize: 16,
      fontFamily: "Inter_500Medium",
      color: colors.textPrimary,
    },
    langLabelActive: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
  });
