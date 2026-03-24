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

import { loansApi } from "@/services/api";
import Colors from "@/constants/colors";
import { useT } from "@/context/I18nContext";

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const [tab, setTab] = useState<"my_loans" | "request">("my_loans");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const res = await loansApi.getMyLoans();
      return res.data?.loans || [];
    },
  });

  const requestLoan = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      await loansApi.requestLoan({ amount: Number(amount), type: "cash advance" });
      setAmount("");
      setTab("my_loans");
      refetch();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to request loan");
    } finally {
      setLoading(false);
    }
  };

  const repayLoan = async (loanId: string, amt: number) => {
    try {
      await loansApi.repayLoan({ loanId, amount: amt });
      refetch();
    } catch (e) {
      alert("Failed to repay loan");
    }
  };

  const renderLoan = ({ item }: { item: any }) => {
    const statusColor = item.status === "completed" ? Colors.success : 
                        item.status === "pending" ? Colors.accent : Colors.primary;
                        
    return (
      <View style={styles.loanCard}>
        <View style={styles.loanHeader}>
          <Text style={styles.loanAmount}>{item.amount?.toLocaleString()} RWF</Text>
          <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {item.status?.toUpperCase() || "PENDING"}
            </Text>
          </View>
        </View>

        <View style={styles.loanDetails}>
          <Text style={styles.detailText}>Remaining: {(item.amount - (item.repaid || 0)).toLocaleString()} RWF</Text>
          <Text style={styles.detailText}>Due: {new Date(item.dueDate || Date.now() + 86400000 * 30).toLocaleDateString()}</Text>
        </View>

        {item.status === "active" && (
          <TouchableOpacity 
            style={styles.repayBtn} 
            onPress={() => repayLoan(item.id, item.amount - (item.repaid || 0))}
          >
            <Text style={styles.repayText}>{t("repay_loan")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("loans")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, tab === "my_loans" && styles.activeTab]}
          onPress={() => setTab("my_loans")}
        >
          <Text style={[styles.tabText, tab === "my_loans" && styles.activeTabText]}>
            {t("my_loans")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, tab === "request" && styles.activeTab]}
          onPress={() => setTab("request")}
        >
          <Text style={[styles.tabText, tab === "request" && styles.activeTabText]}>
            {t("request_loan")}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "my_loans" ? (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderLoan}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="briefcase" size={48} color={Colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No active loans</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Need an advance?</Text>
          <Text style={styles.formSubtitle}>Request a cash advance to cover immediate expenses. Will be deducted from future earnings.</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (RWF)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50000"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={requestLoan}
            disabled={loading || !amount}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textPrimary} />
            ) : (
              <Text style={styles.submitText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textPrimary,
  },
  listContent: {
    padding: 16,
  },
  loanCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  loanAmount: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  loanDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  repayBtn: {
    backgroundColor: "rgba(230, 57, 70, 0.1)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  repayText: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  formContainer: {
    padding: 24,
  },
  formTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
});
