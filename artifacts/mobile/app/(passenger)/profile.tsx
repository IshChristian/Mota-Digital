import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";

export default function PassengerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const s = styles(colors, isDark);

  const menuItems = [
    { icon: "credit-card" as const, label: "Wallet", onPress: () => router.push('/(passenger)/wallet' as any) },
    { icon: "user" as const, label: "Personal Information", onPress: () => router.push('/(passenger)/profile/personal-info' as any) },
    { icon: "shield" as const, label: "Safety", onPress: () => router.push('/(passenger)/profile/safety' as any) },
    { icon: "credit-card" as const, label: "Payment Methods", onPress: () => router.push('/(passenger)/profile/payment-methods' as any) },
    { icon: "bell" as const, label: "Notifications", onPress: () => router.push('/notifications' as any) },
    { icon: "help-circle" as const, label: "Help & Support", onPress: () => router.push('/(passenger)/profile/support' as any) },
    { icon: "info" as const, label: "About MOTA", onPress: () => router.push('/(passenger)/profile/about' as any) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header */}
      <View style={[s.topNav, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {(user?.firstName?.[0] || "M").toUpperCase()}
            </Text>
          </View>
          <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={s.phone}>{user?.phone || user?.email}</Text>
        </View>

        {/* Dark Mode Toggle */}
        <TouchableOpacity style={s.menuItem} onPress={toggleTheme}>
          <View style={s.menuLeft}>
            <View style={s.menuIconBox}>
              <Feather name={isDark ? "sun" : "moon"} size={18} color={colors.primary} />
            </View>
            <Text style={s.menuText}>{isDark ? "Light Mode" : "Dark Mode"}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label} style={s.menuItem} onPress={item.onPress}>
            <View style={s.menuLeft}>
              <View style={s.menuIconBox}>
                <Feather name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={s.menuText}>{item.label}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity style={[s.menuItem, s.logoutItem]} onPress={handleLogout}>
          <View style={s.menuLeft}>
            <View style={[s.menuIconBox, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
              <Feather name="log-out" size={18} color="#EF4444" />
            </View>
            <Text style={[s.menuText, { color: "#EF4444" }]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  topNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.textPrimary },
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  profileHeader: { alignItems: "center", marginBottom: 32, paddingTop: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.textPrimary },
  phone: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginTop: 4 },

  menuItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" },
  menuText: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.textPrimary },
  logoutItem: { marginTop: 16, borderBottomWidth: 0 },
});
