import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

export function PassengerSettingsScreen({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}><View style={[styles.header,{borderColor:colors.border}]}><TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color={colors.textPrimary}/></TouchableOpacity><Text style={[styles.title,{color:colors.textPrimary}]}>{title}</Text><View style={{width:24}}/></View><ScrollView contentContainerStyle={styles.content}>{children}</ScrollView></View>;
}
const styles=StyleSheet.create({header:{height:58,borderBottomWidth:1,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:18,fontFamily:'Inter_700Bold'},content:{padding:16,paddingBottom:60,gap:14}});
