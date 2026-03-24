import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import { useT, useI18n } from "@/context/I18nContext";
import Colors from "@/constants/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useI18n();
  const t = useT();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: logout 
        }
      ]
    );
  };

  const changeLanguage = () => {
    const next = language === 'en' ? 'rw' : language === 'rw' ? 'fr' : 'en';
    setLanguage(next as 'en' | 'rw' | 'fr');
  };

  return (
    <ScrollView 
      style={[styles.container]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t("profile")}</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{user?.role?.toUpperCase() || 'DRIVER'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.row}>
          <View style={styles.rowIcon}>
            <Feather name="user" size={20} color={Colors.textPrimary} />
          </View>
          <Text style={styles.rowText}>Personal Information</Text>
          <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowIcon}>
            <Feather name="credit-card" size={20} color={Colors.textPrimary} />
          </View>
          <Text style={styles.rowText}>Payment Methods</Text>
          <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={changeLanguage}>
          <View style={styles.rowIcon}>
            <Feather name="globe" size={20} color={Colors.textPrimary} />
          </View>
          <Text style={styles.rowText}>Language ({language.toUpperCase()})</Text>
          <Feather name="refresh-cw" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver Details</Text>
        
        <TouchableOpacity style={styles.row}>
          <View style={styles.rowIcon}>
            <Feather name="truck" size={20} color={Colors.textPrimary} />
          </View>
          <Text style={styles.rowText}>Vehicle Information</Text>
          <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowIcon}>
            <Feather name="file-text" size={20} color={Colors.textPrimary} />
          </View>
          <Text style={styles.rowText}>Documents & Permits</Text>
          <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>{t("logout")}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>MOTA App v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  name: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginTop: 32,
    marginHorizontal: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  version: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 24,
  },
});
