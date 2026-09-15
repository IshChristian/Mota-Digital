import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { loansApi, financeApi } from "@/services/api";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { AppAlert } from "@/components/AppAlert";
import { useFinanceStore } from "@/store/financeStore";

type LoanStatus = "all" | "pending" | "under_review" | "approved" | "rejected";

const STATUS_TABS: { key: LoanStatus; label: string }[] = [
  { key: "all",          label: "All" },
  { key: "pending",      label: "Pending" },
  { key: "under_review", label: "Under Review" },
  { key: "approved",     label: "Approved" },
  { key: "rejected",     label: "Rejected" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:      "#F59E0B",
  under_review: "#3B82F6",
  approved:     "#10B981",
  rejected:     "#EF4444",
  active:       "#10B981",
  completed:    "#6B7280",
};

export default function LoansScreen() {
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const t          = useT();
  const { colors, isDark } = useTheme();

  const [activeTab,       setActiveTab]       = useState<LoanStatus>("all");
  const [repaying,        setRepaying]        = useState<string | null>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestingCode,  setRequestingCode]  = useState("");
  const [selectedTin,     setSelectedTin]     = useState("");
  const [ticketNumber,    setTicketNumber]    = useState("");

  const [alert, setAlert] = useState<{
    visible: boolean;
    type: "success" | "error" | "confirm" | "info";
    title: string;
    message?: string;
    onConfirm?: () => void;
  }>({ visible: false, type: "info", title: "" });

  const { eligibility, fetchEligibility } = useFinanceStore();

  useEffect(() => {
    checkConsent();
    fetchEligibility();
  }, []);

  const checkConsent = async () => {
    try {
      const res = await financeApi.getConsent();
      const consents = res.data || [];
      const hasLending = consents.some((c: any) => c.consentType === "lending_terms");
      const hasSavings = consents.some((c: any) => c.consentType === "savings_terms");
      if (!hasLending || !hasSavings) {
        router.push("/finance-consent" as any);
      }
    } catch (err) {
      console.error("Failed to check consent", err);
    }
  };

  const { data: allLoans = [], refetch, isFetching } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const res = await loansApi.getMyLoans();
      return res.data?.loans || [];
    },
  });

  // Filter loans by active tab
  const filteredLoans = useMemo(() => {
    if (activeTab === "all") return allLoans;
    return allLoans.filter((l: any) => l.status === activeTab);
  }, [allLoans, activeTab]);

  // Tab counts
  const countFor = (status: LoanStatus) => {
    if (status === "all") return allLoans.length;
    return allLoans.filter((l: any) => l.status === status).length;
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const repayLoan = (loanId: string, remaining: number) => {
    setAlert({
      visible: true,
      type: "confirm",
      title: "Repay Loan",
      message: `This will deduct ${remaining.toLocaleString()} RWF from your wallet.`,
      onConfirm: async () => {
        setAlert((a) => ({ ...a, visible: false }));
        setRepaying(loanId);
        try {
          await loansApi.repayLoan({ loanId, amount: remaining });
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

  const submitLoanRequest = async () => {
    const tin = selectedTin || requestingCode.trim();
    if (!tin || !ticketNumber.trim()) return;
    setRequestModalVisible(false);
    setAlert({ visible: true, type: "info", title: "Requesting...", message: undefined });
    try {
      await loansApi.requestLoan({ tinNumber: tin, ticketNumber: ticketNumber.trim() });
      refetch();
      setAlert({ visible: true, type: "success", title: "Loan Requested!", message: "Your loan request has been submitted.", onConfirm: undefined });
    } catch (e: any) {
      setAlert({ visible: true, type: "error", title: "Request Failed", message: e.response?.data?.message || "Could not process loan request.", onConfirm: undefined });
    } finally {
      setRequestingCode("");
      setSelectedTin("");
      setTicketNumber("");
    }
  };

  const openRequestModal = () => {
    if (eligibility?.eligible === false) {
      setAlert({
        visible: true,
        type: "error",
        title: "Ineligible for Loan",
        message: eligibility?.reason || "You are currently not eligible for a loan.",
      });
      return;
    }
    setRequestModalVisible(true);
  };

  // ── Card renderer ──────────────────────────────────────────────────────────
  const renderLoan = ({ item }: { item: any }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.textSecondary;
    const remaining   = (item.amount || 0) - (item.repaid || 0);
    const isActive    = item.status === "active" || item.status === "approved";

    return (
      <View style={[s.card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}>
        {/* Card Header */}
        <View style={s.cardHeader}>
          <View>
            <Text style={s.cardAmount}>{(item.amount || 0).toLocaleString()} RWF</Text>
            <Text style={s.cardLabel}>Loan Amount</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>
              {(item.status || "pending").replace("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Card Details */}
        <View style={s.detailGrid}>
          {item.tinNumber ? (
            <View style={s.detailItem}>
              <Feather name="hash" size={13} color={colors.textTertiary} />
              <Text style={s.detailLabel}>TIN</Text>
              <Text style={s.detailValue}>{item.tinNumber}</Text>
            </View>
          ) : null}
          {item.ticketNumber ? (
            <View style={s.detailItem}>
              <Feather name="tag" size={13} color={colors.textTertiary} />
              <Text style={s.detailLabel}>Ticket</Text>
              <Text style={s.detailValue}>{item.ticketNumber}</Text>
            </View>
          ) : null}
          {remaining > 0 ? (
            <View style={s.detailItem}>
              <Feather name="credit-card" size={13} color={colors.textTertiary} />
              <Text style={s.detailLabel}>Remaining</Text>
              <Text style={s.detailValue}>{remaining.toLocaleString()} RWF</Text>
            </View>
          ) : null}
          {item.dueDate ? (
            <View style={s.detailItem}>
              <Feather name="calendar" size={13} color={colors.textTertiary} />
              <Text style={s.detailLabel}>Due</Text>
              <Text style={s.detailValue}>{new Date(item.dueDate).toLocaleDateString()}</Text>
            </View>
          ) : null}
          {item.createdAt ? (
            <View style={s.detailItem}>
              <Feather name="clock" size={13} color={colors.textTertiary} />
              <Text style={s.detailLabel}>Requested</Text>
              <Text style={s.detailValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          ) : null}
        </View>

        {/* Admin Note / Reason */}
        {item.reason || item.adminNote ? (
          <View style={s.noteBox}>
            <Feather name="info" size={13} color={colors.textSecondary} />
            <Text style={s.noteText}>{item.adminNote || item.reason}</Text>
          </View>
        ) : null}

        {/* Repay Button — only for active/approved */}
        {isActive && remaining > 0 ? (
          <TouchableOpacity
            style={s.repayBtn}
            disabled={!!repaying}
            onPress={() => repayLoan(item._id || item.id, remaining)}
          >
            {repaying === (item._id || item.id) ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Feather name="arrow-up-circle" size={16} color={colors.primary} />
                <Text style={s.repayText}>{t("repay_loan")}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const s = styles(colors, isDark);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("loans")}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsRow}
      >
        {STATUS_TABS.map((tab) => {
          const count   = countFor(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, isActive && s.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.tabText, isActive && s.activeTabText]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[s.tabBadge, isActive && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeText, isActive && s.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Loan List */}
      <FlatList
        data={filteredLoans}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        renderItem={renderLoan}
        contentContainerStyle={s.listContent}
        refreshing={isFetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name="briefcase" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={s.emptyTitle}>
              {activeTab === "all" ? "No loans yet" : `No ${activeTab.replace("_", " ")} loans`}
            </Text>
            <Text style={s.emptyText}>
              {activeTab === "all"
                ? "Submit a loan request using the button below."
                : "Switch to 'All' to see all your loans."}
            </Text>
          </View>
        }
      />

      {/* Floating Request Button */}
      <TouchableOpacity
        style={[s.floatingBtn, eligibility?.eligible === false && { opacity: 0.5 }]}
        onPress={openRequestModal}
      >
        <Feather name="plus" size={22} color="#fff" />
        <Text style={s.floatingBtnText}>Request Loan</Text>
      </TouchableOpacity>

      {/* Request Loan Modal */}
      {requestModalVisible && (
        <View style={s.overlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Request Loan</Text>
              <TouchableOpacity
                onPress={() => {
                  setRequestModalVisible(false);
                  setSelectedTin("");
                  setTicketNumber("");
                  setRequestingCode("");
                }}
              >
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalText}>
              Enter your TIN Number and Ticket Number to submit a loan request.
            </Text>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>TIN Number</Text>
              <TextInput
                style={s.textInput}
                placeholder="9-digit TIN (e.g. 123456789)"
                placeholderTextColor={colors.textTertiary}
                value={requestingCode}
                onChangeText={(v) => {
                  setRequestingCode(v);
                  setSelectedTin("");
                }}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Ticket Number</Text>
              <TextInput
                style={s.textInput}
                placeholder="e.g. TKT-2025-00123"
                placeholderTextColor={colors.textTertiary}
                value={ticketNumber}
                onChangeText={setTicketNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalBtnCancel}
                onPress={() => {
                  setRequestModalVisible(false);
                  setSelectedTin("");
                  setTicketNumber("");
                  setRequestingCode("");
                }}
              >
                <Text style={s.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.modalBtnSubmit,
                  ((!requestingCode && !selectedTin) || !ticketNumber.trim()) && { opacity: 0.5 },
                ]}
                onPress={submitLoanRequest}
                disabled={(!requestingCode && !selectedTin) || !ticketNumber.trim()}
              >
                <Text style={s.modalBtnSubmitText}>Submit Request</Text>
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

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container:    { flex: 1, backgroundColor: colors.background },
    header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    closeBtn:     { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    headerTitle:  { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textPrimary },

    // ── Tabs ──────────────────────────────────────────────────────────────────
    tabsRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      gap: 6,
    },
    activeTab: { backgroundColor: colors.primary },
    tabText:   { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary },
    activeTabText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
    tabBadge: {
      minWidth: 18, height: 18, borderRadius: 9,
      backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
      alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    tabBadgeActive:     { backgroundColor: "rgba(255,255,255,0.25)" },
    tabBadgeText:       { fontSize: 10, fontFamily: "Inter_700Bold", color: colors.textSecondary },
    tabBadgeTextActive: { color: "#fff" },

    // ── List ──────────────────────────────────────────────────────────────────
    listContent: { padding: 16, paddingBottom: 100 },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    cardAmount: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.textPrimary },
    cardLabel:  { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textTertiary, marginTop: 2 },
    statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
    statusDot:   { width: 6, height: 6, borderRadius: 3 },
    statusText:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

    divider: { height: 1, backgroundColor: colors.border, marginBottom: 12 },

    detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
    detailItem: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    detailLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textTertiary },
    detailValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textPrimary },

    noteBox: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      padding: 10, borderRadius: 10, marginBottom: 12,
    },
    noteText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: 18 },

    repayBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 12, borderRadius: 10,
      backgroundColor: `${colors.primary}12`,
      borderWidth: 1, borderColor: `${colors.primary}30`,
    },
    repayText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },

    // ── Empty ─────────────────────────────────────────────────────────────────
    emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textPrimary, marginBottom: 8 },
    emptyText:  { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 20 },

    // ── Floating Button ───────────────────────────────────────────────────────
    floatingBtn: {
      position: "absolute", bottom: 24, right: 24,
      backgroundColor: colors.primary, borderRadius: 28,
      paddingHorizontal: 20, height: 54,
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    },
    floatingBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },

    // ── Modal ─────────────────────────────────────────────────────────────────
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24, zIndex: 100 },
    modalContent: { width: "100%", backgroundColor: colors.backgroundCard, borderRadius: 20, padding: 24, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    modalTitle:  { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.textPrimary },
    modalText:   { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: 20, lineHeight: 20 },

    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.textSecondary, marginBottom: 6 },
    textInput:  { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, padding: 14, color: colors.textPrimary, fontFamily: "Inter_500Medium", fontSize: 15 },

    modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    modalBtnCancel: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center", backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" },
    modalBtnCancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.textSecondary },
    modalBtnSubmit: { flex: 2, paddingVertical: 13, borderRadius: 10, alignItems: "center", backgroundColor: colors.primary },
    modalBtnSubmitText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  });
