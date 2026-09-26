import { ReactNode } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

export function PassengerScreen({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const contentStyle = [styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 }];
  return scroll ? (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>{children}</View>
  );
}

export function PassengerHeader({ title, subtitle, back = true, logo = false, action }: { title: string; subtitle?: string; back?: boolean; logo?: boolean; action?: ReactNode }) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const logoSource = isDark
    ? require("@/assets/images/mota-icon-black.png")
    : require("@/assets/images/mota-icon-white.png");
  return (
    <View style={styles.header}>
      {back ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Feather name="arrow-left" size={21} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : null}
      {logo ? <Image source={logoSource} style={styles.logo} resizeMode="contain" /> : null}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {action || <View style={styles.actionSpace} />}
    </View>
  );
}

export function PassengerCard({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }, style]}>{children}</View>;
}

export function PassengerMenuRow({ icon, label, detail, onPress, danger = false }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; detail?: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useTheme();
  const tint = danger ? colors.error : colors.primary;
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.76} onPress={onPress} style={[styles.menu, { borderBottomColor: colors.border }]}>
      <View style={[styles.menuIcon, { backgroundColor: `${tint}18` }]}><Feather name={icon} size={19} color={tint} /></View>
      <View style={styles.copy}><Text style={[styles.menuLabel, { color: danger ? tint : colors.textPrimary }]}>{label}</Text>{detail ? <Text style={[styles.menuDetail, { color: colors.textSecondary }]}>{detail}</Text> : null}</View>
      <Feather name="chevron-right" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", minHeight: 52, gap: 12 },
  back: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 44, height: 44 },
  copy: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, fontFamily: "Inter_500Medium" },
  actionSpace: { width: 44 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16 },
  menu: { minHeight: 66, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 10 },
  menuIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDetail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
