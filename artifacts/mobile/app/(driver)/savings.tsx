import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useFinanceStore } from '@/store/financeStore';
import { financeApi } from '@/services/api';
import { useRouter } from 'expo-router';

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  const { savingsStatus, fetchSavingsStatus } = useFinanceStore();
  const [refreshing, setRefreshing] = useState(false);
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkConsent();
    fetchSavingsStatus();
  }, []);

  const checkConsent = async () => {
    try {
      const res = await financeApi.getConsent();
      const consents = res.data || [];
      const hasLending = consents.some((c: any) => c.consentType === 'lending_terms');
      const hasSavings = consents.some((c: any) => c.consentType === 'savings_terms');
      
      if (!hasLending || !hasSavings) {
        router.push('/finance-consent' as any);
      }
    } catch (err) {
      console.error('Failed to check consent', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSavingsStatus();
    setRefreshing(false);
  };

  const handleTransaction = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalType === 'deposit') {
        await financeApi.depositSavings({ amount: numAmount });
        Alert.alert('Success', 'Deposit successful!');
      } else if (modalType === 'withdraw') {
        await financeApi.withdrawSavings({ amount: numAmount });
        Alert.alert('Success', 'Withdrawal successful!');
      }
      setModalType(null);
      setAmount('');
      fetchSavingsStatus();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || `Failed to ${modalType}`);
    } finally {
      setSubmitting(false);
    }
  };

  const s = styles(colors, isDark);

  if (!savingsStatus && !refreshing) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const balance = savingsStatus?.balance || 0;
  const rewardAccrued = savingsStatus?.rewardAccrued || 0;
  const rewardEligible = savingsStatus?.rewardEligible || false;
  const daysHeld = savingsStatus?.daysHeld || 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <Text style={s.title}>Keep Me in Bank</Text>
        </View>

        {/* Hero Card */}
        <View style={s.heroCard}>
          <Text style={s.balanceLabel}>Savings Balance</Text>
          <Text style={s.balanceAmount}>{balance.toLocaleString()} RWF</Text>
          
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={() => setModalType('deposit')}>
              <Feather name="arrow-down-circle" size={20} color="#fff" />
              <Text style={s.actionBtnText}>Deposit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[s.actionBtn, s.withdrawBtn]} onPress={() => setModalType('withdraw')}>
              <Feather name="arrow-up-circle" size={20} color={colors.primary} />
              <Text style={[s.actionBtnText, { color: colors.primary }]}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reward Tracker */}
        <View style={s.trackerCard}>
          <View style={s.trackerHeader}>
            <Text style={s.trackerTitle}>Monthly Reward Progress</Text>
            <Text style={s.trackerDays}>{daysHeld}/30 Days</Text>
          </View>
          
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${Math.min((daysHeld / 30) * 100, 100)}%` }]} />
          </View>

          {rewardEligible ? (
            <View style={s.rewardEligibleBox}>
              <Feather name="award" size={20} color="#FFD700" />
              <Text style={s.rewardEligibleText}>Your funds are currently earning 2% monthly interest!</Text>
            </View>
          ) : (
            <Text style={s.rewardPendingText}>Hold funds for 30 days to earn 2% interest.</Text>
          )}

          <View style={s.accruedBox}>
            <Text style={s.accruedLabel}>Accrued Reward</Text>
            <Text style={s.accruedAmount}>+{rewardAccrued.toLocaleString()} RWF</Text>
          </View>
        </View>
      </ScrollView>

      {/* Transaction Modal */}
      {modalType && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{modalType === 'deposit' ? 'Deposit to Savings' : 'Withdraw to Wallet'}</Text>
              <TouchableOpacity onPress={() => { setModalType(null); setAmount(''); }}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={s.inputContainer}>
              <Text style={s.inputLabel}>Amount (RWF)</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
            </View>

            <TouchableOpacity 
              style={s.submitBtn} 
              onPress={handleTransaction}
              disabled={submitting || !amount}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>{modalType === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdraw'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: colors.textPrimary,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  withdrawBtn: {
    backgroundColor: '#fff',
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  trackerCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackerTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.textPrimary,
  },
  trackerDays: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  rewardEligibleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? "rgba(255,215,0,0.1)" : "rgba(255,215,0,0.15)",
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 16,
  },
  rewardEligibleText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFD700",
    lineHeight: 18,
  },
  rewardPendingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    marginBottom: 16,
  },
  accruedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accruedLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
  },
  accruedAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: colors.success,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.textPrimary,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
