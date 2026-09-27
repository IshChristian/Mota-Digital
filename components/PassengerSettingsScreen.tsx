import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ScreenHeader } from '@/components/ScreenHeader';

export function PassengerSettingsScreen({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><ScreenHeader title={title} />{children}</ScrollView></View>;
}
const styles=StyleSheet.create({content:{paddingHorizontal:18,paddingTop:0,paddingBottom:80,gap:16}});
