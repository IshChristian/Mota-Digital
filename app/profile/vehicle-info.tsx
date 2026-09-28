import { ScrollView, Text, View, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { driverApi, kycApi } from "@/services/api";
import { ScreenHeader } from "@/components/ScreenHeader";

const display = (value: unknown) => typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "null" ? value.trim() : "N/A";

export default function VehicleInfoScreen() {
  const { colors } = useTheme();
  const profile = useQuery({ queryKey: ["driver_profile"], queryFn: async () => { const response = await driverApi.getProfile(); return response.data?.data?.profile || response.data?.data || response.data?.profile || response.data; } });
  const kyc = useQuery({ queryKey: ["driver_kyc"], queryFn: async () => (await kycApi.getMine()).data?.data });
  const data = profile.data;
  const row = (label: string, value: unknown, icon: React.ComponentProps<typeof Feather>["name"]) => <View key={label} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", gap: 12, alignItems: "flex-start" }}><Feather name={icon} size={18} color={colors.primary} /><View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text><Text selectable style={{ color: colors.textPrimary, fontSize: 16, marginTop: 4, flexShrink: 1, lineHeight: 23 }}>{display(value)}</Text></View></View>;
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 70 }}>
    <ScreenHeader title="Vehicle information" />
    {profile.isLoading ? <ActivityIndicator color={colors.primary} /> : <>
      <View style={{ backgroundColor: colors.backgroundCard, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center", marginBottom: 20 }}><Feather name={kyc.data?.vehicleType === "car" ? "truck" : "navigation"} size={36} color={colors.primary} /><Text style={{ color: colors.textPrimary, fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 12 }}>{display(data?.plateNumber || kyc.data?.plateNumber)}</Text><Text style={{ color: colors.textSecondary }}>Plate number</Text></View>
      <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 10 }}>Vehicle and cooperative</Text>
      <View style={{ backgroundColor: colors.backgroundCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
        {row("Cooperative name", data?.cooperativeName || kyc.data?.cooperativeName, "users")}
        {row("Vehicle type", kyc.data?.vehicleType, "truck")}
        {row("Power type", kyc.data?.powertrain, "zap")}
        {row("Verification status", kyc.data?.status, "shield")}
      </View>
    </>}
  </ScrollView>;
}
