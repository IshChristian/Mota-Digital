import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { driverApi } from "@/services/api";

export default function DocumentsScreen() {
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

  const DocCard = ({ title, value, icon }: { title: string; value?: string; icon: any }) => {
    const hasDoc = !!value;
    return (
      <TouchableOpacity
        style={[s.docCard, hasDoc && s.docCardActive]}
        onPress={() => hasDoc && Linking.openURL(value!)}
        disabled={!hasDoc}
      >
        <View style={[s.docIcon, hasDoc && s.docIconActive]}>
          <Feather name={hasDoc ? "check-circle" : icon} size={24} color={hasDoc ? colors.success : colors.textSecondary} />
        </View>
        <View style={s.docBody}>
          <Text style={s.docTitle}>{title}</Text>
          <Text style={s.docStatus}>{hasDoc ? "Uploaded — tap to view" : "Not uploaded"}</Text>
        </View>
        {hasDoc && <Feather name="external-link" size={16} color={colors.textSecondary} />}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 8, paddingBottom: 40 }]}
    >
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Documents & Permits</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={s.statusCard}>
            <View style={s.statusIcon}>
              <Feather name="shield" size={28} color={colors.primary} />
            </View>
            <View>
              <Text style={s.statusTitle}>Document Status</Text>
              <Text style={s.statusSub}>
                {data?.insuranceAttachment && data?.permitAttachment
                  ? "All documents verified"
                  : "Some documents missing"}
              </Text>
            </View>
          </View>

          <Text style={s.sectionLabel}>Your Documents</Text>

          <DocCard
            title="Insurance Certificate"
            value={data?.insuranceAttachment}
            icon="shield"
          />
          <DocCard
            title="Driving Permit"
            value={data?.permitAttachment}
            icon="file-text"
          />
          <DocCard
            title="Permit ID"
            value={data?.permitId}
            icon="credit-card"
          />
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
    statusCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: `${colors.primary}18`, alignItems: "center", justifyContent: "center" },
    statusTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.textPrimary, marginBottom: 4 },
    statusSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
    docCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    docCardActive: { borderColor: `${colors.success}60` },
    docIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.backgroundElevated, alignItems: "center", justifyContent: "center", marginRight: 14 },
    docIconActive: { backgroundColor: `${colors.success}18` },
    docBody: { flex: 1 },
    docTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.textPrimary, marginBottom: 4 },
    docStatus: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary },
  });
