import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { walletApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { DriverHeader } from "@/components/driver/DriverUI";

type ModalType = "cash_in" | "cash_out" | null;

export default function WalletScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalType, setModalType] = useState<ModalType>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    data: balanceData,
    isLoading: balLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["wallet_balance"],
    queryFn: async () => {
      const res = await walletApi.getBalance();
      return res.data;
    },
    refetchInterval: 5000,
  });

  const balance = balanceData?.balance ?? 0;
  const today = balanceData?.today;
  const recentTransactions = balanceData?.recentTransactions || [];

  const openModal = (type: ModalType) => {
    setAmount("");
    setPhone(user?.phone || "");
    setSubmitError("");
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
    setAmount("");
    setSubmitError("");
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setSubmitError("Please enter a valid amount");
      return;
    }
    if (modalType === "cash_in" && !phone) {
      setSubmitError("Please enter your phone number");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      if (modalType === "cash_in") {
        await walletApi.cashIn({ amount: amt, phone });
        Alert.alert(
          "Cash In Initiated",
          "You will receive a MoMo push notification to confirm the payment.",
        );
      } else {
        await walletApi.cashOut({ amount: amt });
        Alert.alert(
          "Withdrawal Submitted",
          "Your withdrawal request has been submitted and is pending admin approval.",
        );
      }
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["wallet_balance"] });
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderTx = ({ item }: { item: any }) => {
    const isCredit = item.type === "cash_in" || item.type === "earning";
    const icon =
      item.type === "ride"
        ? "car"
        : isCredit
          ? "arrow-down-left"
          : "arrow-up-right";
    const amtColor = isCredit ? colors.success : colors.error;

    return (
      <View style={s.txCard}>
        <View
          style={[
            s.txIcon,
            {
              backgroundColor: isCredit
                ? `${colors.success}18`
                : `${colors.error}10`,
            },
          ]}
        >
          <Feather name={icon as any} size={20} color={amtColor} />
        </View>
        <View style={s.txInfo}>
          <Text style={s.txTitle}>{item.description || item.type}</Text>
          <Text style={s.txDate}>
            {new Date(item.createdAt || Date.now()).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[s.txAmount, { color: amtColor }]}>
          {isCredit ? "+" : "-"}
          {Math.abs(item.amount || 0).toLocaleString()}
        </Text>
      </View>
    );
  };

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <DriverHeader
          title={t("wallet")}
          subtitle="Manage earnings, deposits, withdrawals, and transaction activity."
        />
      </View>

      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderTx}
        contentContainerStyle={s.listContent}
        refreshing={isFetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={s.balanceCard}>
              <Text style={s.balanceLabel}>Total Balance</Text>
              {balLoading ? (
                <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
              ) : (
                <>
                  <Text style={s.balanceAmount}>
                    {balance.toLocaleString()} RWF
                  </Text>

                  {today && (
                    <View style={s.todayStatsRow}>
                      <View style={s.todayStat}>
                        <Text style={s.todayStatLabel}>Today's Income</Text>
                        <Text
                          style={[s.todayStatValue, { color: colors.success }]}
                        >
                          +{today.income?.toLocaleString()} RWF
                        </Text>
                      </View>
                      <View style={s.todayStatDivider} />
                      <View style={s.todayStat}>
                        <Text style={s.todayStatLabel}>Today's Net</Text>
                        <Text style={[s.todayStatValue, { color: "#fff" }]}>
                          {today.net > 0 ? "+" : ""}
                          {today.net?.toLocaleString()} RWF
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              <View style={s.actions}>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => openModal("cash_in")}
                >
                  <View style={s.iconCircle}>
                    <Feather name="download" size={18} color="#fff" />
                  </View>
                  <Text style={s.actionText}>Cash In</Text>
                </TouchableOpacity>
                <View style={s.divider} />
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => openModal("cash_out")}
                >
                  <View style={s.iconCircle}>
                    <Feather name="upload" size={18} color="#fff" />
                  </View>
                  <Text style={s.actionText}>Cash Out</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={s.sectionTitle}>{t("transactions")}</Text>
          </>
        }
        ListEmptyComponent={
          !isFetching ? (
            <View style={s.emptyState}>
              <Feather
                name="file-text"
                size={48}
                color={colors.textSecondary}
                style={{ marginBottom: 16 }}
              />
              <Text style={s.emptyTitle}>No transactions yet</Text>
            </View>
          ) : null
        }
      />

      {/* Cash In / Cash Out Modal */}
      <Modal
        visible={!!modalType}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />

              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>
                  {modalType === "cash_in"
                    ? "💰 Cash In via MoMo"
                    : "📤 Request Withdrawal"}
                </Text>
                <TouchableOpacity onPress={closeModal}>
                  <Feather name="x" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={s.modalDesc}>
                {modalType === "cash_in"
                  ? "Add money to your MOTA wallet via MTN MoMo. You'll receive a push notification to confirm."
                  : "Request a withdrawal from your MOTA wallet. Pending admin approval."}
              </Text>

              {modalType === "cash_in" ? (
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>MoMo Phone Number</Text>
                  <View style={s.inputRow}>
                    <Feather
                      name="phone"
                      size={16}
                      color={colors.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={s.modalInput}
                      placeholder="+250788123456"
                      placeholderTextColor={colors.textTertiary}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              ) : null}

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Amount (RWF)</Text>
                <View style={s.inputRow}>
                  <Text style={s.currencyLabel}>RWF</Text>
                  <TextInput
                    style={s.modalInput}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Quick amounts */}
              <View style={s.quickAmounts}>
                {[1000, 2000, 5000, 10000].map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[
                      s.quickAmtBtn,
                      amount === String(a) && s.quickAmtActive,
                    ]}
                    onPress={() => setAmount(String(a))}
                  >
                    <Text
                      style={[
                        s.quickAmtText,
                        amount === String(a) && s.quickAmtTextActive,
                      ]}
                    >
                      {(a / 1000).toFixed(0)}K
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {submitError ? (
                <View style={s.errorRow}>
                  <Feather name="alert-circle" size={14} color={colors.error} />
                  <Text style={s.errorText}>{submitError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={s.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.submitText}>
                    {modalType === "cash_in"
                      ? "Initiate Cash In"
                      : "Submit Withdrawal"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingVertical: 16 },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    balanceCard: {
      backgroundColor: colors.secondary,
      borderRadius: 20,
      padding: 24,
      marginBottom: 28,
    },
    balanceLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.7)",
      marginBottom: 6,
    },
    balanceAmount: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      color: "#fff",
      marginBottom: 16,
    },
    todayStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.15)",
      borderRadius: 12,
      padding: 12,
      marginBottom: 24,
    },
    todayStat: { flex: 1, alignItems: "center" },
    todayStatLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.7)",
      marginBottom: 4,
    },
    todayStatValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
    todayStatDivider: {
      width: 1,
      height: 24,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    actions: { flexDirection: "row", alignItems: "center" },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 10,
    },
    divider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    actionText: {
      color: "#fff",
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
      marginBottom: 16,
    },
    txCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    txInfo: { flex: 1 },
    txTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
      marginBottom: 3,
      textTransform: "capitalize",
    },
    txDate: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    txAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
    emptyState: { alignItems: "center", paddingVertical: 48 },
    emptyTitle: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.backgroundCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 20,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    modalDesc: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginBottom: 20,
      lineHeight: 20,
    },
    inputGroup: { marginBottom: 16 },
    inputLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    currencyLabel: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      marginRight: 8,
    },
    modalInput: {
      flex: 1,
      padding: 14,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
    },
    quickAmounts: { flexDirection: "row", gap: 8, marginBottom: 20 },
    quickAmtBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.backgroundElevated,
    },
    quickAmtActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}18`,
    },
    quickAmtText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
    },
    quickAmtTextActive: { color: colors.primary },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.error,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
    },
    submitText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
  });
