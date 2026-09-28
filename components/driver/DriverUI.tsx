import React, { ReactNode } from "react";
import {
  ActivityIndicator,
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

type IconName = React.ComponentProps<typeof Feather>["name"];

export function DriverScreen({
  children,
  scroll = false,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.screenContent,
    { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 104 },
  ];

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {children}
    </View>
  );
}

export function DriverHeader({
  title,
  subtitle,
  action,
  showLogo = true,
  back = true,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  showLogo?: boolean;
  back?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const logo = isDark
    ? require("@/assets/images/official-mota-black-logo-removebg-preview.png")
    : require("@/assets/images/official-mota-white-logo-removebg-preview.png");

  return (
    <View style={styles.header}>
      {back ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(driver)" as any)}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.headerCopy}>
        {showLogo ? (
          <Image source={logo} resizeMode="contain" style={styles.logo} />
        ) : null}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function DriverCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.backgroundCard, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "success" | "danger" | "warning" | "neutral";
}) {
  const { colors, isDark } = useTheme();
  const toneColor =
    tone === "success"
      ? colors.success
      : tone === "danger"
        ? colors.error
        : tone === "warning"
          ? "#F59E0B"
          : colors.textSecondary;
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: `${toneColor}${isDark ? "26" : "16"}` },
      ]}
    >
      <View style={[styles.pillDot, { backgroundColor: toneColor }]} />
      <Text style={[styles.pillText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

export function DriverButton({
  label,
  icon,
  onPress,
  disabled,
  variant = "primary",
  loading,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.error
        : colors.backgroundElevated;
  const foreground = variant === "secondary" ? colors.textPrimary : "#FFFFFF";
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.button,
        { backgroundColor, opacity: disabled || loading ? 0.55 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={18} color={foreground} /> : null}
          <Text style={[styles.buttonText, { color: foreground }]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.backgroundElevated },
        ]}
      >
        <Feather name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {action}
    </View>
  );
}

export function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: IconName;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <Feather name={icon} size={18} color={colors.primary} />
      <Text
        style={[styles.metricValue, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { paddingHorizontal: 18, gap: 18 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: { flex: 1 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  logo: { width: 104, height: 30, marginBottom: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  card: { borderWidth: 1, borderRadius: 22, padding: 18 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  pill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  emptyMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  metric: { flex: 1, minWidth: 92, gap: 5 },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 17 },
  metricLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
});
