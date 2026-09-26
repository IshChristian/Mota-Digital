import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const links = [
  ["user", "Account and data", "/account"],
  ["bell", "Notification settings", "/notification-settings"],
  ["smartphone", "Active sessions", "/sessions"],
  ["shield", "Security", "/security"],
  ["help-circle", "Help center", "/info/help"],
] as const;

export default function AgentProfile() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const photo = user?.avatarUrl || user?.profileImage;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 110, gap: 18 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: "700" }}>Agent account</Text>
      <View style={{ backgroundColor: colors.backgroundCard, borderRadius: 18, padding: 20, flexDirection: "row", alignItems: "center", gap: 15 }}>
        {photo ? <Image source={{ uri: photo }} style={{ width: 56, height: 56, borderRadius: 28 }} /> : <Feather name="user" size={32} color={colors.primary} />}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700" }}>{user?.firstName} {user?.lastName}</Text>
          <Text style={{ color: colors.textSecondary }}>{user?.phone}</Text>
        </View>
      </View>
      {links.map(([icon, label, path]) => (
        <TouchableOpacity key={path} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(path as any)} style={{ backgroundColor: colors.backgroundCard, padding: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Feather name={icon} size={20} color={colors.primary} />
          <Text style={{ color: colors.textPrimary, flex: 1 }}>{label}</Text>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
      <TouchableOpacity accessibilityRole="button" onPress={() => Alert.alert("Log out", "Sign out from this device?", [{ text: "Cancel", style: "cancel" }, { text: "Log out", onPress: () => void logout() }])} style={{ padding: 16 }}>
        <Text style={{ color: colors.error, fontWeight: "700" }}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
