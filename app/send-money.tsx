import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { transferApi, walletApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Colors from "@/constants/colors";

export default function SendMoneyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; method?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState(params.phone || "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [result, setResult] = useState<any>(null);

  const isQR = params.method === "qr";

  const { data: balanceData } = useQuery({
    queryKey: ["wallet_balance"],
    queryFn: async () => {
      const res = await walletApi.getBalance();
      return res.data;
    },
    staleTime: 30000,
  });

  const balance = balanceData?.balance ?? 0;

  const handleContinue = () => {
    if (!phone || phone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number.");
      return;
    }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    if (amt > balance) {
      Alert.alert("Insufficient Balance", `Your wallet balance is ${balance.toLocaleString()} RWF.`);
      return;
    }
    setStep("confirm");
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const payload = {
        phone: phone.startsWith("+") ? phone : `+250${phone.replace(/^0/, "")}`,
        amount: parseFloat(amount),
        description: description || undefined,
      };

      const res = isQR
        ? await transferApi.sendViaQR(payload)
        : await transferApi.send(payload);

      setResult(res.data);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["wallet_balance"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err: any) {
      Alert.alert(
        "Transfer Failed",
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors, isDark);

  if (step === "success") {
    return (
      <View style={s.container}>
        <View style={[s.successContainer, { paddingTop: insets.top + 40 }]}>
          <View style={s.successCircle}>
            <Feather name="check" size={48} color="#fff" />
          </View>
          <Text style={s.successTitle}>Transfer Successful!</Text>
          <Text style={s.successSubtitle}>
            {parseFloat(amount).toLocaleString()} RWF sent to {phone}
          </Text>

          {result && (
            <View style={s.receiptCard}>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Reference</Text>
                <Text style={s.receiptValue}>{result.reference || "—"}</Text>
              </View>
              <View style={s.receiptDivider} />
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Amount Sent</Text>
                <Text style={s.receiptValue}>{(result.amount || parseFloat(amount)).toLocaleString()} RWF</Text>
              </View>
              <View style={s.receiptDivider} />
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Transfer Fee</Text>
                <Text style={s.receiptValue}>{(result.fee || 0).toLocaleString()} RWF</Text>
              </View>
              <View style={s.receiptDivider} />
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Total Deducted</Text>
                <Text style={[s.receiptValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                  {(result.totalDeducted || 0).toLocaleString()} RWF
                </Text>
              </View>
              <View style={s.receiptDivider} />
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>New Balance</Text>
                <Text style={[s.receiptValue, { color: colors.success }]}>
                  {(result.senderBalance || 0).toLocaleString()} RWF
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === "confirm") {
    return (
      <View style={s.container}>
        <View style={[s.header, { paddingTop: insets.top || 16 }]}>
          <TouchableOpacity onPress={() => setStep("form")} style={s.closeBtn}>
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Confirm Transfer</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={s.confirmContent}>
          <View style={s.confirmCard}>
            <Feather name="send" size={32} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={s.confirmAmount}>{parseFloat(amount).toLocaleString()} RWF</Text>
            <Text style={s.confirmTo}>to {phone}</Text>
            {description ? <Text style={s.confirmDesc}>"{description}"</Text> : null}
          </View>

          <View style={s.confirmDetails}>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>From</Text>
              <Text style={s.confirmValue}>{user?.firstName} {user?.lastName}</Text>
            </View>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>To</Text>
              <Text style={s.confirmValue}>{phone}</Text>
            </View>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>Method</Text>
              <Text style={s.confirmValue}>{isQR ? "QR Transfer" : "Direct Transfer"}</Text>
            </View>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>Wallet Balance</Text>
              <Text style={s.confirmValue}>{balance.toLocaleString()} RWF</Text>
            </View>
          </View>

          <View style={s.warningBox}>
            <Feather name="alert-circle" size={16} color={Colors.accent || "#F4A261"} />
            <Text style={s.warningText}>
              A transfer fee will be deducted from your balance based on system settings.
            </Text>
          </View>

          <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="send" size={18} color="#fff" />
                <Text style={s.sendBtnText}>Send Money</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={() => setStep("form")}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[s.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>{isQR ? "QR Transfer" : "Send Money"}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Balance display */}
        <View style={s.balanceRow}>
          <Text style={s.balanceLabel}>Available Balance</Text>
          <Text style={s.balanceValue}>{balance.toLocaleString()} RWF</Text>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Recipient Phone Number</Text>
          <View style={s.inputRow}>
            <Feather name="phone" size={18} color={colors.textSecondary} />
            <TextInput
              style={s.input}
              placeholder="+250788123456"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Amount (RWF)</Text>
          <View style={s.inputRow}>
            <Text style={s.currencyPrefix}>RWF</Text>
            <TextInput
              style={s.input}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Quick amounts */}
        <View style={s.quickAmounts}>
          {[1000, 2000, 5000, 10000].map((a) => (
            <TouchableOpacity
              key={a}
              style={[s.quickBtn, amount === String(a) && s.quickBtnActive]}
              onPress={() => setAmount(String(a))}
            >
              <Text style={[s.quickBtnText, amount === String(a) && s.quickBtnTextActive]}>
                {(a / 1000).toFixed(0)}K
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Description (optional)</Text>
          <View style={s.inputRow}>
            <Feather name="file-text" size={18} color={colors.textSecondary} />
            <TextInput
              style={s.input}
              placeholder="Payment for services"
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        <TouchableOpacity style={s.continueBtn} onPress={handleContinue}>
          <Text style={s.continueBtnText}>Continue</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      width: 44, height: 44,
      alignItems: "center", justifyContent: "center",
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    balanceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    balanceValue: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.success,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      gap: 10,
    },
    currencyPrefix: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
    },
    input: {
      flex: 1,
      padding: 16,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.textPrimary,
    },
    quickAmounts: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },
    quickBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.backgroundElevated,
    },
    quickBtnActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}18`,
    },
    quickBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
    },
    quickBtnTextActive: {
      color: colors.primary,
    },
    continueBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    continueBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    // Confirm step
    confirmContent: {
      flex: 1,
      padding: 24,
    },
    confirmCard: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 20,
      padding: 28,
      alignItems: "center",
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmAmount: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
    },
    confirmTo: {
      fontSize: 16,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginTop: 4,
    },
    confirmDesc: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      marginTop: 8,
      fontStyle: "italic",
    },
    confirmDetails: {
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    confirmLabel: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    confirmValue: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    warningBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: isDark ? "rgba(244,162,97,0.1)" : "rgba(244,162,97,0.08)",
      borderRadius: 12,
      padding: 14,
      marginBottom: 24,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      lineHeight: 18,
    },
    sendBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    sendBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    cancelBtn: {
      padding: 16,
      alignItems: "center",
      marginTop: 8,
    },
    cancelBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    // Success step
    successContainer: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 24,
    },
    successCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    successTitle: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    successSubtitle: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginBottom: 32,
    },
    receiptCard: {
      width: "100%",
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 32,
    },
    receiptRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    receiptDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    receiptLabel: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    receiptValue: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    doneBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 64,
    },
    doneBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
