import { Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import type { MoveStatus } from "@/constants/moving";

export function StatusPill({ status }: { status: MoveStatus }) {
  const { colors } = useTheme();
  const t = useT();
  const color = status === "cancelled" ? colors.textTertiary : status === "completed" ? colors.success : status === "quoted" ? colors.primary : "#F59E0B";
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: `${color}22` }}>
      <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 12 }}>{t(`move.status_${status}`)}</Text>
    </View>
  );
}
