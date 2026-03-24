import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { walletApi } from "@/services/api";
import { useT } from "@/context/I18nContext";
import Colors from "@/constants/colors";

export default function WalletScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();

  const { data: balanceData, isLoading: balLoading } = useQuery({
    queryKey: ["wallet_balance"],
    queryFn: async () => {
      const res = await walletApi.getBalance();
      return res.data;
    },
  });

  const { data: txData, refetch, isFetching } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await walletApi.getTransactions(1);
      return res.data?.transactions || [];
    },
  });

  const balance = balanceData?.balance || 0;

  const renderTx = ({ item }: { item: any }) => {
    const isCredit = item.type === "cash_in" || item.type === "earning";
    const icon = item.type === "ride" ? "car" : (isCredit ? "arrow-down-left" : "arrow-up-right");
    const color = isCredit ? Colors.success : Colors.textPrimary;

    return (
      <View style={styles.txCard}>
        <View style={[styles.txIcon, { backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)' }]}>
          <Feather name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle}>{item.description || item.type}</Text>
          <Text style={styles.txDate}>
            {new Date(item.createdAt || Date.now()).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.txAmount, { color }]}>
          {isCredit ? "+" : "-"}{Math.abs(item.amount || 0).toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("wallet")}</Text>
      </View>

      <View style={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          {balLoading ? (
            <ActivityIndicator color={Colors.textPrimary} style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.balanceAmount}>{balance.toLocaleString()} RWF</Text>
          )}
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Feather name="download" size={20} color={Colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>{t("cash_in")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Feather name="upload" size={20} color={Colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>{t("cash_out")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("transactions")}</Text>

        <FlatList
          data={txData}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderTx}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="file-text" size={48} color={Colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No transactions</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  balanceCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  txIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  txDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  txAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
