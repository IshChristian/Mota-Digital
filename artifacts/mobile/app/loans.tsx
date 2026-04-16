import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { loansApi } from "@/services/api";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { AppAlert } from "@/components/AppAlert";
import Colors from "@/constants/colors";

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"my_loans" | "info">("my_loans");
  const [repaying, setRepaying] = useState<string | null>(null);

  const [alert, setAlert] = useState<{
    visible: boolean;
    type: "success" | "error" | "confirm" | "info";
    title: string;
    message?: string;
    onConfirm?: () => void;
  }>({ visible: false, type: "info", title: "" });

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const res = await loansApi.getMyLoans();
      return res.data?.loans || [];
    },
  });

  const repayLoan = (loanId: string, remainingAmount: number) => {
    setAlert({
      visible: true,
      type: "confirm",
      title: "Repay Loan",
      message: `This will deduct ${remainingAmount.toLocaleString()} RWF from your wallet to repay this loan.`,
      onConfirm: async () => {
        setAlert((a) => ({ ...a, visible: false }));
        setRepaying(loanId);
        try {
          await loansApi.repayLoan({ loanId, amount: remainingAmount });
          refetch();
          setAlert({ visible: true, type: "success", title: "Loan Repaid!", message: "Your repayment was successful.", onConfirm: undefined });
        } catch (e: any) {
          setAlert({ visible: true, type: "error", title: "Repayment Failed", message: e.response?.data?.message || "Could not process repayment.", onConfirm: undefined });
        } finally {
          setRepaying(null);
        }
      },
    });
  };

  const s = styles(colors);

  const renderLoan = ({ item }: { item: any }) => {
    const statusColor =
      item.status === "completed"
        ? colors.success
        : item.status === "pending"
          ? Colors.accent
          : colors.primary;
    const remaining = item.amount - (item.repaid || 0);

    return (
      <View style={s.loanCard}>
        <View style={s.loanHeader}>
          <Text style={s.loanAmount}>{item.amount?.toLocaleString()} RWF</Text>
          <View style={[s.badge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>
              {item.status?.toUpperCase() || "PENDING"}
            </Text>
          </View>
        </View>

        <View style={s.loanDetails}>
          <View style={s.detailRow}>
            <Feather name="credit-card" size={14} color={colors.textSecondary} />
            <Text style={s.detailText}>Remaining: {remaining.toLocaleString()} RWF</Text>
          </View>
          <View style={s.detailRow}>
            <Feather name="calendar" size={14} color={colors.textSecondary} />
            <Text style={s.detailText}>
              Due: {new Date(item.dueDate || Date.now() + 86400000 * 30).toLocaleDateString()}
            </Text>
          </View>
          {item.fineId && (
            <View style={s.detailRow}>
              <Feather name="alert-triangle" size={14} color={colors.textSecondary} />
              <Text style={s.detailText}>Fine ID: {item.fineId?.slice(0, 10)}…</Text>
            </View>
          )}
        </View>

        {item.status === "active" && (
          <TouchableOpacity
            style={s.repayBtn}
            disabled={!!repaying}
            onPress={() => repayLoan(item.id, remaining)}
          >
            {repaying === item.id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={s.repayText}>{t("repay_loan")}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("loans")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === "my_loans" && s.activeTab]}
          onPress={() => setTab("my_loans")}
        >
          <Text style={[s.tabText, tab === "my_loans" && s.activeTabText]}>{t("my_loans")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === "info" && s.activeTab]}
          onPress={() => setTab("info")}
        >
          <Text style={[s.tabText, tab === "info" && s.activeTabText]}>How It Works</Text>
        </TouchableOpacity>
      </View>

      {tab === "my_loans" ? (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderLoan}
          contentContainerStyle={s.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Feather name="briefcase" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={s.emptyTitle}>No active loans</Text>
              <Text style={s.emptyText}>Loans are issued when you have a pending fine. Contact your cooperative or admin if you need financial assistance.</Text>
            </View>
          }
        />
      ) : (
        <View style={s.infoContainer}>
          <View style={s.infoCard}>
            <Feather name="info" size={28} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={s.infoTitle}>About Fine Loans</Text>
            <Text style={s.infoText}>
              MOTA offers fine loans to help drivers pay traffic fines or other penalties. Loans are always linked to a specific fine issued by traffic authorities or the cooperative.
            </Text>
          </View>

          {[
            { icon: "alert-triangle", step: "1", text: "You receive a fine from traffic authority or cooperative." },
            { icon: "file-text", step: "2", text: "MOTA or your admin issues a loan against that fine, linked to its ID." },
            { icon: "check-circle", step: "3", text: "Loan amount is used to cover the fine immediately." },
            { icon: "credit-card", step: "4", text: "Repayment is deducted from your wallet automatically or manually." },
          ].map((item) => (
            <View key={item.step} style={s.stepRow}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{item.step}</Text>
              </View>
              <View style={s.stepBody}>
                <Feather name={item.icon as any} size={16} color={colors.primary} style={{ marginBottom: 4 }} />
                <Text style={s.stepText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <AppAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        confirmText={alert.type === "confirm" ? "Repay" : "OK"}
        cancelText="Cancel"
        onConfirm={alert.onConfirm || (() => setAlert((a) => ({ ...a, visible: false })))}
        onCancel={() => setAlert((a) => ({ ...a, visible: false }))}
      />
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
    closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textPrimary },
    tabs: { flexDirection: "row", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: "transparent" },
    activeTab: { borderBottomColor: colors.primary },
    tabText: { fontSize: 16, fontFamily: "Inter_500Medium", color: colors.textSecondary },
    activeTabText: { color: colors.textPrimary },
    listContent: { padding: 16 },
    loanCard: { backgroundColor: colors.backgroundCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    loanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    loanAmount: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.textPrimary },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
    loanDetails: { gap: 8, marginBottom: 16 },
    detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    detailText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    repayBtn: { backgroundColor: `${colors.primary}15`, padding: 12, borderRadius: 10, alignItems: "center" },
    repayText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textPrimary, marginBottom: 8 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
    infoContainer: { padding: 20 },
    infoCard: { backgroundColor: colors.backgroundCard, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
    infoTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.textPrimary, marginBottom: 10 },
    infoText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 21 },
    stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
    stepNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 14 },
    stepNumText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
    stepBody: { flex: 1 },
    stepText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: 20 },
  });
