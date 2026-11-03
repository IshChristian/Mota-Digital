import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWideLayout } from '@/hooks/useWideLayout';

/** Settings-style page: header and a readable column (wider gutters on desktop browsers). */
export function PassengerSettingsScreen({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  const { colors } = useTheme();
  const { wide } = useWideLayout();
  return <View style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={[styles.content, wide && styles.wide]} keyboardShouldPersistTaps="handled"><ScreenHeader title={title} subtitle={subtitle} action={action} />{children}</ScrollView></View>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 0, paddingBottom: 120, gap: 16, width: "100%", maxWidth: 760, alignSelf: "center" },
  wide: { maxWidth: 720, paddingHorizontal: 32, paddingTop: 12, paddingBottom: 64 },
});
