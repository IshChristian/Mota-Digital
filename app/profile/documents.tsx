import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { driverApi, kycApi } from "@/services/api";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function DocumentsScreen() {
  const { colors } = useTheme();
  const profile = useQuery({ queryKey: ["driver_profile"], queryFn: async () => { const response = await driverApi.getProfile(); return response.data?.data?.profile || response.data?.data || response.data?.profile || response.data; } });
  const kyc = useQuery({ queryKey: ["driver_kyc"], queryFn: async () => (await kycApi.getMine()).data?.data });
  const data = kyc.data;
  const card = (title: string, value?: string) => {
    const available = typeof value === "string" && value.trim().length > 0;
    const openable = available && /^https?:\/\//i.test(value);
    return <TouchableOpacity key={title} accessibilityRole="button" disabled={!openable} onPress={() => void Linking.openURL(value!)} style={{ backgroundColor: colors.backgroundCard, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Feather name={available ? "check-circle" : "file-text"} size={22} color={available ? colors.success : colors.textSecondary} />
      <View style={{ flex: 1 }}><Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{title}</Text><Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>{openable ? "Submitted · tap to view" : available ? "Submitted for review" : "Not submitted"}</Text></View>
      {openable ? <Feather name="external-link" size={18} color={colors.textSecondary} /> : null}
    </TouchableOpacity>;
  };
  const group = (title: string, entries: Array<[string, string | undefined]>) => <View key={title} style={{ marginBottom: 12 }}><Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 12 }}>{title}</Text>{entries.map(([label, value]) => card(label, value))}</View>;
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 70 }}>
    <ScreenHeader title="Documents & permits" />
    {profile.isLoading || kyc.isLoading ? <ActivityIndicator color={colors.primary} /> : <>
      <View style={{ backgroundColor: colors.backgroundCard, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 24 }}><Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Review status: {data?.status || "Not submitted"}</Text><Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 5 }}>Submitted documents are reviewed by MOTA. A check mark means a file is present, not that it has been approved.</Text></View>
      {group("Identity", [["National ID front", data?.nationalIdFront], ["National ID back", data?.nationalIdBack], ["Selfie", data?.selfie]])}
      {group("License and permits", [["Driver's license", data?.drivingLicenseDocument], ["Transport permit", data?.transportPermitDocument || profile.data?.permitAttachment]])}
      {group("Vehicle documents", [["Insurance certificate", data?.insuranceDocument || profile.data?.insuranceAttachment], ["Vehicle registration", data?.vehicleRegistrationDocument]])}
    </>}
  </ScrollView>;
}
