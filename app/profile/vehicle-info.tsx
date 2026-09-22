import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { driverApi } from "@/services/api";

export default function VehicleInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["driver_profile"],
    queryFn: async () => {
      const res = await driverApi.getProfile();
      return res.data?.profile || res.data;
    },
  });

  const s = styles(colors);

  const Row = ({ label, value, icon }: { label: string; value?: string; icon?: any }) => (
    <View style={s.row}>
      <View style={s.rowIconWrap}>
        <Feather name={icon || "info"} size={16} color={colors.primary} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value || "—"}</Text>
      </View>
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
        <Text style={s.title}>Vehicle Information</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={s.heroCard}>
            <Feather name="truck" size={48} color={colors.primary} />
            <Text style={s.plateNumber}>{data?.plateNumber || "—"}</Text>
            <Text style={s.plateLabel}>Plate Number</Text>
          </View>

          <View style={s.card}>
            <Row label="Cooperative Name" value={data?.cooperativeName} icon="users" />
            <Row label="National ID" value={data?.nid} icon="credit-card" />
            <Row label="Status" value={data?.status || "Active"} icon="check-circle" />
            <Row label="KYC Level" value={data?.kycLevel || "—"} icon="shield" />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: { paddingHorizontal: 16 },
    topBar: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
    backBtn: { padding: 4, marginRight: 12 },
    title: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.textPrimary },
    heroCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 20,
      padding: 32,
      alignItems: "center",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    plateNumber: { fontSize: 32, fontFamily: "Inter_700Bold", color: colors.textPrimary, marginTop: 16, marginBottom: 4 },
    plateLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    card: { backgroundColor: colors.backgroundCard, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    row: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center", marginRight: 14 },
    rowBody: { flex: 1 },
    rowLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
    rowValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.textPrimary },
  });
