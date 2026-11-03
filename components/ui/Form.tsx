import { Children, ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

type Icon = React.ComponentProps<typeof Feather>["name"];

/** A titled section card used on settings and form pages. `tone="danger"` for destructive areas. */
export function FormCard({ title, description, icon, tone, children }: { title?: string; description?: string; icon?: Icon; tone?: "danger"; children?: ReactNode }) {
  const { colors } = useTheme();
  const accent = tone === "danger" ? colors.error : colors.primary;
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: tone === "danger" ? `${colors.error}55` : colors.border }]}>
      {title ? (
        <View style={styles.cardHead}>
          {icon ? <View style={[styles.icon, { backgroundColor: `${accent}18` }]}><Feather name={icon} size={18} color={accent} /></View> : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: tone === "danger" ? colors.error : colors.textPrimary }]}>{title}</Text>
            {description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text> : null}
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Labelled text input. Read-only fields render as a muted value box. */
export function FormField({ label, hint, readOnly, value, ...input }: TextInputProps & { label: string; hint?: string; readOnly?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {readOnly ? (
        <View style={[styles.input, styles.readOnly, { borderColor: colors.border, backgroundColor: colors.backgroundElevated }]}>
          <Text style={{ color: value ? colors.textPrimary : colors.textTertiary, fontFamily: "Inter_600SemiBold", flex: 1 }}>{value || "—"}</Text>
          <Feather name="lock" size={14} color={colors.textTertiary} />
        </View>
      ) : (
        <TextInput accessibilityLabel={label} value={value} placeholderTextColor={colors.textTertiary} {...input}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }, input.style]} />
      )}
      {hint ? <Text style={[styles.hint, { color: colors.textTertiary }]}>{hint}</Text> : null}
    </View>
  );
}

/** Primary, outline or danger button with an optional icon and loading state. */
export function FormButton({ label, onPress, variant = "primary", icon, loading, disabled }: { label: string; onPress: () => void; variant?: "primary" | "outline" | "danger"; icon?: Icon; loading?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  const filled = variant !== "outline";
  const tint = variant === "danger" ? colors.error : colors.primary;
  const fg = filled ? "#fff" : tint;
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: disabled || loading }} disabled={disabled || loading} onPress={onPress}
      style={[styles.button, filled ? { backgroundColor: tint } : { borderWidth: 1, borderColor: tint }, (disabled || loading) && { opacity: 0.5 }]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon ? <Feather name={icon} size={17} color={fg} /> : null}<Text style={[styles.buttonText, { color: fg }]}>{label}</Text></>}
    </TouchableOpacity>
  );
}

/** Two fields side by side on wide screens, stacked on phones. */
export function FormRow({ children }: { children: ReactNode }) {
  // flexBasis only makes sense across a row; in a column it would become a fixed height.
  return <View style={styles.row}>{Children.toArray(children).filter(Boolean).map((child, i) => <View key={i} style={styles.rowItem}>{child}</View>)}</View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 14 },
  cardHead: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 16 },
  description: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 3 },
  field: { gap: 6 },
  rowItem: { flexGrow: 1, flexBasis: 220, minWidth: 0 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, fontSize: 15, fontFamily: "Inter_500Medium" },
  readOnly: { flexDirection: "row", alignItems: "center", gap: 8 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12 },
  button: { minHeight: 50, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
});
