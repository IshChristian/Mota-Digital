import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { promoApi, getApiErrorMessage, type PromoPreview } from "@/services/api";

type Props = {
  appliesTo: "ride" | "registration_fee";
  rideId?: string;
  disabled?: boolean;
  onChange: (applied: PromoPreview | null) => void;
};

/**
 * "Promo code" box with Apply. The backend previews the discounted price (nothing is
 * reserved); the screen sends the applied code with its payment call.
 */
export function PromoCodeInput({ appliesTo, rideId, disabled, onChange }: Props) {
  const { colors } = useTheme();
  const t = useT();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<PromoPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const apply = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setChecking(true);
    setError("");
    try {
      const { data } = await promoApi.preview({ code: clean, appliesTo, rideId });
      setApplied(data.data);
      onChange(data.data);
    } catch (err) {
      setApplied(null);
      onChange(null);
      setError(getApiErrorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  const remove = () => {
    setApplied(null);
    setCode("");
    setError("");
    onChange(null);
  };

  const s = styles(colors);
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{t("promo.label")}</Text>
      {applied ? (
        <View style={s.appliedRow}>
          <Feather name="tag" size={16} color={colors.success} />
          <Text style={[s.appliedText, { color: colors.success }]}>
            {applied.code} · {t("promo.applied", { percent: String(applied.percent), payAmount: applied.payAmount.toLocaleString() })}
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={remove} disabled={disabled}>
            <Text style={s.link}>{t("promo.remove")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.row}>
          <TextInput
            style={s.input}
            value={code}
            onChangeText={(value) => { setCode(value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20)); setError(""); }}
            placeholder={t("promo.placeholder")}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!disabled}
            accessibilityLabel={t("promo.label")}
            onSubmitEditing={apply}
          />
          <TouchableOpacity accessibilityRole="button" style={[s.applyBtn, (!code.trim() || disabled) && { opacity: 0.5 }]} onPress={apply} disabled={!code.trim() || checking || disabled}>
            {checking ? <ActivityIndicator color={colors.primary} /> : <Text style={s.applyText}>{t("promo.apply")}</Text>}
          </TouchableOpacity>
        </View>
      )}
      {error ? <Text style={[s.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    wrap: { alignSelf: "stretch", gap: 6 },
    label: { color: colors.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" },
    row: { flexDirection: "row", gap: 8 },
    input: {
      flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: 15, letterSpacing: 1,
    },
    applyBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center", minWidth: 80, alignItems: "center" },
    applyText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    appliedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: `${colors.success}18` },
    appliedText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    link: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
    error: { fontSize: 13, fontFamily: "Inter_500Medium" },
  });
