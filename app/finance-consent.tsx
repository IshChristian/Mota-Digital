import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { financeApi } from '@/services/api';

export default function FinanceConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lendingConsent, setLendingConsent] = useState(false);
  const [savingsConsent, setSavingsConsent] = useState(false);

  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    try {
      const res = await financeApi.getConsent();
      const consents = res.data || [];
      const hasLending = consents.some((c: any) => c.consentType === 'lending_terms');
      const hasSavings = consents.some((c: any) => c.consentType === 'savings_terms');
      
      if (hasLending && hasSavings) {
        router.back();
      } else {
        setLendingConsent(hasLending);
        setSavingsConsent(hasSavings);
      }
    } catch (err) {
      console.error('Failed to check consent', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAgree = async () => {
    if (!lendingConsent || !savingsConsent) {
      Alert.alert('Required', 'Please agree to all terms before continuing.');
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all([
        financeApi.signConsent({ consentType: 'lending_terms', version: 'v1.0' }),
        financeApi.signConsent({ consentType: 'savings_terms', version: 'v1.0' })
      ]);
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const s = styles(colors, isDark);

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Terms & Conditions</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Feather name="shield" size={48} color={colors.primary} style={s.icon} />
        <Text style={s.heading}>Finance Features Consent</Text>
        <Text style={s.description}>
          Before you can access the new Loans or Savings features, we need your consent to process your data according to Rwanda's data-protection laws.
        </Text>

        <TouchableOpacity 
          style={s.checkboxRow} 
          onPress={() => setLendingConsent(!lendingConsent)}
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, lendingConsent && s.checkboxChecked]}>
            {lendingConsent && <Feather name="check" size={16} color="#fff" />}
          </View>
          <Text style={s.checkboxText}>I agree to the lending terms and credit check.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={s.checkboxRow} 
          onPress={() => setSavingsConsent(!savingsConsent)}
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, savingsConsent && s.checkboxChecked]}>
            {savingsConsent && <Feather name="check" size={16} color="#fff" />}
          </View>
          <Text style={s.checkboxText}>I agree to data processing for risk calculation.</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom || 24 }]}>
        <TouchableOpacity 
          style={[s.btn, (!lendingConsent || !savingsConsent) && s.btnDisabled]} 
          onPress={handleAgree}
          disabled={submitting || !lendingConsent || !savingsConsent}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>Agree & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: colors.textPrimary,
  },
  content: {
    padding: 24,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: colors.textPrimary,
    flex: 1,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
