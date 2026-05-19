import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { loansApi, driverApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { AppAlert } from "@/components/AppAlert";
import Colors from "@/constants/colors";

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { colors } = useTheme();
  const { riderStatus } = useAuth();
  const [tab, setTab] = useState<"my_loans" | "fines" | "info">("my_loans");
  const [repaying, setRepaying] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState<string>("");
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedFineId, setSelectedFineId] = useState<string>("");

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

  // Get fines either from rider status or empty
  const fines = riderStatus?.fines || [];
  const pendingFines = fines.filter(
    (f: any) => f.status === "pending" || f.status === "active" || f.status === "unpaid"
  );

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

  const requestLoanWithFineId = async (fineId: string) => {
    setAlert({ visible: true, type: "info", title: "Requesting...", message: undefined });
    try {
      await loansApi.requestLoan({ fineId });
      refetch();
      setAlert({ visible: true, type: "success", title: "Loan Requested!", message: "Your fine loan request has been submitted.", onConfirm: undefined });
    } catch (e: any) {
      setAlert({ visible: true, type: "error", title: "Request Failed", message: e.response?.data?.message || "Could not process loan request.", onConfirm: undefined });
    }
  };

  const requestLoan = async () => {
    const id = selectedFineId || requestingCode.trim();
    if (!id) return;
    setRequestModalVisible(false);
    await requestLoanWithFineId(id);
    setRequestingCode("");
    setSelectedFineId("");
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

  const renderFine = ({ item }: { item: any }) => {
    const statusColor =
      item.status === "paid"
        ? colors.success
        : item.status === "pending" || item.status === "unpaid"
          ? "#F59E0B"
          : colors.primary;

    const canRequestLoan = item.status === "pending" || item.status === "unpaid" || item.status === "active";

    return (
      <View style={s.loanCard}>
        <View style={s.loanHeader}>
          <Text style={s.loanAmount}>{(item.amount || 0).toLocaleString()} RWF</Text>
          <View style={[s.badge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>
              {(item.status || "PENDING").toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={s.loanDetails}>
          {item.reason && (
            <View style={s.detailRow}>
              <Feather name="file-text" size={14} color={colors.textSecondary} />
              <Text style={s.detailText}>{item.reason}</Text>
            </View>
          )}
          <View style={s.detailRow}>
            <Feather name="hash" size={14} color={colors.textSecondary} />
            <Text style={s.detailText}>ID: {item.id?.slice(0, 14) || "N/A"}</Text>
          </View>
          {item.createdAt && (
            <View style={s.detailRow}>
              <Feather name="calendar" size={14} color={colors.textSecondary} />
              <Text style={s.detailText}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {canRequestLoan && (
          <TouchableOpacity
            style={s.requestLoanBtn}
            onPress={() => {
              setAlert({
                visible: true,
                type: "confirm",
                title: "Request Fine Loan",
                message: `Request a loan of ${(item.amount || 0).toLocaleString()} RWF to cover this fine?`,
                onConfirm: () => {
                  setAlert((a) => ({ ...a, visible: false }));
                  requestLoanWithFineId(item.id);
                },
              });
            }}
          >
            <Feather name="briefcase" size={16} color="#fff" />
            <Text style={s.requestLoanBtnText}>Request Loan</Text>
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
          style={[s.tab, tab === "fines" && s.activeTab]}
          onPress={() => setTab("fines")}
        >
          <Text style={[s.tabText, tab === "fines" && s.activeTabText]}>
            My Fines
            {pendingFines.length > 0 ? ` (${pendingFines.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === "info" && s.activeTab]}
          onPress={() => setTab("info")}
        >
          <Text style={[s.tabText, tab === "info" && s.activeTabText]}>How It Works</Text>
        </TouchableOpacity>
      </View>

      {tab === "my_loans" ? (
        <View style={{ flex: 1 }}>
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
                <Text style={s.emptyText}>Loans are issued when you have a pending fine. Request a new loan below.</Text>
              </View>
            }
          />
          <TouchableOpacity style={s.floatingBtn} onPress={() => setRequestModalVisible(true)}>
            <Feather name="plus" size={24} color="#fff" />
            <Text style={s.floatingBtnText}>Request Loan</Text>
          </TouchableOpacity>
        </View>
      ) : tab === "fines" ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={fines}
            keyExtractor={(item: any) => item.id?.toString() || Math.random().toString()}
            renderItem={renderFine}
            contentContainerStyle={s.listContent}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Feather name="check-circle" size={48} color={colors.success} style={{ marginBottom: 16 }} />
                <Text style={s.emptyTitle}>No fines</Text>
                <Text style={s.emptyText}>You don't have any fines. Keep driving safely!</Text>
              </View>
            }
          />
        </View>
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

      {/* Request Loan Modal */}
      {requestModalVisible && (
        <View style={s.overlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Request Fine Loan</Text>

            {/* Show pending fines as quick-select if available */}
            {pendingFines.length > 0 && (
              <View style={s.fineSelectSection}>
                <Text style={s.fineSelectLabel}>Select a Fine</Text>
                {pendingFines.slice(0, 5).map((fine: any) => (
                  <TouchableOpacity
                    key={fine.id}
                    style={[
                      s.fineSelectItem,
                      selectedFineId === fine.id && s.fineSelectItemActive,
                    ]}
                    onPress={() => {
                      setSelectedFineId(fine.id);
                      setRequestingCode("");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.fineSelectAmount}>
                        {(fine.amount || 0).toLocaleString()} RWF
                      </Text>
                      <Text style={s.fineSelectReason}>
                        {fine.reason || "Traffic fine"}
                      </Text>
                    </View>
                    {selectedFineId === fine.id && (
                      <Feather name="check-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                <View style={s.orDivider}>
                  <View style={s.orLine} />
                  <Text style={s.orText}>OR</Text>
                  <View style={s.orLine} />
                </View>
              </View>
            )}

            <Text style={s.modalText}>Enter the Fine ID to request a loan against.</Text>
            <View style={s.inputContainer}>
              <TextInput
                style={s.textInput}
                placeholder="FINE-202X-XXXXXX"
                placeholderTextColor={colors.textTertiary}
                value={requestingCode}
                onChangeText={(v) => {
                  setRequestingCode(v);
                  setSelectedFineId("");
                }}
                autoCapitalize="characters"
              />
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalBtnAction} onPress={() => { setRequestModalVisible(false); setSelectedFineId(""); }}>
                <Text style={s.modalBtnTextScnd}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnAction, s.modalBtnPrimary]}
                onPress={requestLoan}
                disabled={!requestingCode && !selectedFineId}
              >
                <Text style={s.modalBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <AppAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        confirmText={alert.type === "confirm" ? "Confirm" : "OK"}
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
    tab: { paddingVertical: 12, marginRight: 20, borderBottomWidth: 2, borderBottomColor: "transparent" },
    activeTab: { borderBottomColor: colors.primary },
    tabText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.textSecondary },
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
    requestLoanBtn: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    requestLoanBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
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
    floatingBtn: { position: "absolute", bottom: 24, right: 24, backgroundColor: colors.primary, borderRadius: 28, paddingHorizontal: 20, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
    floatingBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16, marginLeft: 8 },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24, zIndex: 100 },
    modalContent: { width: "100%", backgroundColor: colors.backgroundCard, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.textPrimary, marginBottom: 12 },
    modalText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: 12 },
    inputContainer: { marginBottom: 20 },
    textInput: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, padding: 12, color: colors.textPrimary, fontFamily: "Inter_500Medium" },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
    modalBtnAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    modalBtnPrimary: { backgroundColor: colors.primary },
    modalBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
    modalBtnTextScnd: { color: colors.textSecondary, fontFamily: "Inter_500Medium" },
    // Fine selection in modal
    fineSelectSection: { marginBottom: 12 },
    fineSelectLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
    fineSelectItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
    },
    fineSelectItemActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    fineSelectAmount: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.textPrimary },
    fineSelectReason: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 2 },
    orDivider: { flexDirection: "row", alignItems: "center", marginVertical: 8, gap: 10 },
    orLine: { flex: 1, height: 1, backgroundColor: colors.border },
    orText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textTertiary },
  });
