import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { rwandaLocalDigits } from "@/utils/rwandaPhone";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  accessibilityLabel?: string;
};

export function RwandaPhoneInput({
  value,
  onChangeText,
  placeholder = "7XX XXX XXX",
  editable = true,
  accessibilityLabel = "Rwanda phone number",
}: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
      ]}
    >
      <View style={[styles.prefix, { borderRightColor: colors.border }]}>
        <Text style={[styles.flag, { color: colors.textPrimary }]}>RW</Text>
        <Text style={[styles.code, { color: colors.textPrimary }]}>+250</Text>
      </View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        style={[styles.input, { color: colors.textPrimary }]}
        value={rwandaLocalDigits(value)}
        onChangeText={(text) => onChangeText(rwandaLocalDigits(text))}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={9}
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  prefix: {
    height: 34,
    paddingHorizontal: 13,
    borderRightWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  flag: { fontSize: 10, fontFamily: "Inter_700Bold" },
  code: { fontSize: 15, fontFamily: "Inter_700Bold" },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});
