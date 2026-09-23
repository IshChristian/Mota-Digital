import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { PassengerHeader } from '@/components/passenger/PassengerUI';

export function PassengerSettingsScreen({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><PassengerHeader title={title} />{children}</ScrollView></View>;
}
const styles=StyleSheet.create({content:{paddingHorizontal:18,paddingTop:12,paddingBottom:80,gap:16}});
