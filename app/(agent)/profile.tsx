import { ScrollView, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
export default function AgentProfile() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 18 }}>
    <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: "700" }}>Agent account</Text>
    <Text style={{ color: colors.textPrimary }}>{user?.firstName} {user?.lastName}</Text>
    <Text style={{ color: colors.textSecondary }}>{user?.phone}</Text>
    <TouchableOpacity onPress={() => router.push("/search" as any)}><Text style={{ color: colors.primary }}>Search MOTA</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => void logout()}><Text style={{ color: colors.error }}>Log out</Text></TouchableOpacity>
  </ScrollView>;
}
