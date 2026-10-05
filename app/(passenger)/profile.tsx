import { Alert } from "@/components/GlobalAlert";
import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { PassengerCard, PassengerHeader, PassengerMenuRow } from "@/components/passenger/PassengerUI";
import { usersApi, getApiErrorMessage } from "@/services/api";

export default function PassengerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const [photoBusy, setPhotoBusy] = useState(false);
  const photo = user?.avatarUrl || user?.profileImage;

  const changePhoto = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") return Alert.alert("Photo permission", "Allow access to select a profile photo.");
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
      const asset = result.assets[0];
      const updated = await usersApi.uploadAvatar(asset.uri, asset.base64, asset.fileName || undefined, asset.mimeType || undefined);
      await updateUser({ avatarUrl: updated.avatarUrl });
      Alert.alert("Photo updated", "Your profile photo is ready.");
    } catch (error) { Alert.alert("Photo upload failed", getApiErrorMessage(error)); }
    finally { setPhotoBusy(false); }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const s = styles(colors, isDark);

  const menuItems = [
    {
      icon: "credit-card" as const,
      label: "Wallet",
      onPress: () => router.push("/(passenger)/wallet" as any),
    },
    {
      icon: "gift" as const,
      label: "Invite friends",
      onPress: () => router.push("/referrals" as any),
    },
    {
      icon: "user" as const,
      label: "Personal Information",
      onPress: () => router.push("/(passenger)/profile/personal-info" as any),
    },
    {
      icon: "check-circle" as const,
      label: "Passenger Verification",
      onPress: () => router.push("/(passenger)/profile/kyc" as any),
    },
    {
      icon: "shield" as const,
      label: "Safety",
      onPress: () => router.push("/(passenger)/profile/safety" as any),
    },
    {
      icon: "credit-card" as const,
      label: "Payment Methods",
      onPress: () => router.push("/(passenger)/profile/payment-methods" as any),
    },
    {
      icon: "bell" as const,
      label: "Notification Settings",
      onPress: () => router.push("/notification-settings" as any),
    },
    {
      icon: "alert-circle" as const,
      label: "Ride Disputes & Refunds",
      onPress: () => router.push("/ride-disputes" as any),
    },
    {
      icon: "smartphone" as const,
      label: "Active Sessions",
      onPress: () => router.push("/sessions" as any),
    },
    {
      icon: "lock" as const,
      label: "Security & Account",
      onPress: () => router.push("/security" as any),
    },
    {
      icon: "search" as const,
      label: "Search",
      onPress: () => router.push("/search" as any),
    },
    {
      icon: "help-circle" as const,
      label: "Help Center",
      onPress: () => router.push("/info/help" as any),
    },
    {
      icon: "phone" as const,
      label: "Contact MOTA",
      onPress: () => router.push("/info/contact" as any),
    },
    {
      icon: "info" as const,
      label: "About MOTA",
      onPress: () => router.push("/info/about" as any),
    },
    {
      icon: "book-open" as const,
      label: "Legal & Safety Center",
      onPress: () => router.push("/info/legal" as any),
    },
    {
      icon: "shield" as const,
      label: "Privacy Policy",
      onPress: () => router.push("/info/privacy" as any),
    },
    {
      icon: "file-text" as const,
      label: "Terms of Service",
      onPress: () => router.push("/info/passenger-terms" as any),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 12 }}
        showsVerticalScrollIndicator={false}
      >
        <PassengerHeader title="Account" subtitle="Safety, payments, and support" action={photo ? <Image source={{ uri: photo }} style={{ width: 42, height: 42, borderRadius: 21 }} /> : <Feather name="user" size={24} color={colors.primary} />} />
        {/* Profile Header */}
        <PassengerCard style={s.profileHeader}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={photoBusy} onPress={() => void changePhoto()} style={s.avatar}>
            {photo ? <Image source={{ uri: photo }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : <Feather name="user" size={30} color="#fff" />}
          </TouchableOpacity>
          <Text style={s.phone}>{photoBusy ? "Uploading photo…" : "Tap photo to change"}</Text>
          <Text style={s.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={s.phone}>{user?.phone || user?.email}</Text>
        </PassengerCard>

        {(user?.kycLevel !== "full" || (!!user?.email && !user?.isEmailVerified)) && <PassengerCard style={{ padding: 16, marginBottom: 16 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 6 }}>Finish account verification</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>Your phone is verified. You can use the app while completing the remaining steps.</Text>
          {user?.kycLevel !== "full" && <PassengerMenuRow icon="check-circle" label="Complete passenger ID and selfie" detail="Submit documents for review" onPress={() => router.push("/(passenger)/profile/kyc" as any)} />}
          {!!user?.email && !user?.isEmailVerified && <PassengerMenuRow icon="mail" label="Verify email (optional)" detail={user.email} onPress={() => router.push("/(auth)/verify-email" as any)} />}
        </PassengerCard>}

        <PassengerCard style={{ paddingVertical: 0 }}>
          <PassengerMenuRow icon={isDark ? "sun" : "moon"} label={isDark ? "Light mode" : "Dark mode"} detail="Change how MOTA looks" onPress={toggleTheme} />

        {/* Menu Items */}
        {menuItems.map((item) => (
          <PassengerMenuRow key={item.label} icon={item.icon} label={item.label} onPress={item.onPress} />
        ))}

          <PassengerMenuRow icon="log-out" label="Logout" detail="Sign out from this device" onPress={handleLogout} danger />
        </PassengerCard>
      </ScrollView>
    </View>
  );
}

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    topNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    navTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
    },
    profileHeader: { alignItems: "center", marginVertical: 20, paddingVertical: 22 },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
    name: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    phone: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginTop: 4,
    },

    menuItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    menuIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    menuText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.textPrimary,
    },
    logoutItem: { marginTop: 16, borderBottomWidth: 0 },
  });
