import { StyleSheet } from "react-native";
import type { ThemeColors } from "@/context/ThemeContext";

export const rideStyles = (c: ThemeColors) => StyleSheet.create({
  panel: { gap: 12 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.textPrimary },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: c.textSecondary },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  body: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.textPrimary },
  card: { backgroundColor: c.backgroundElevated, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, minHeight: 48, fontSize: 15, fontFamily: "Inter_500Medium", color: c.textPrimary, paddingVertical: 10 },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.inputBg, borderColor: c.inputBorder, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  primaryBtn: { minHeight: 54, borderRadius: 16, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  primaryText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  secondaryBtn: { minHeight: 48, borderRadius: 14, backgroundColor: c.backgroundElevated, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 14 },
  secondaryText: { color: c.textPrimary, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  chip: { paddingHorizontal: 14, minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.backgroundElevated, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  chipActive: { borderColor: c.primary, backgroundColor: `${c.primary}1A` },
  chipText: { color: c.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.backgroundCard },
  listItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 52 },
  iconBubble: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: `${c.primary}1A` },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  error: { color: c.error, fontFamily: "Inter_500Medium", fontSize: 13 },
});
