import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LANGUAGES, useI18n, useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { usersApi } from "@/services/api";

/** Language button for screens shown before the account page is reachable (sign-in and setup). */
export function LanguagePicker() {
  const { language, setLanguage } = useI18n();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const t = useT();
  const [open, setOpen] = useState(false);
  const label = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
  const choose = (code: (typeof LANGUAGES)[number]["code"]) => {
    setOpen(false);
    void setLanguage(code);
    // Saved on the account too, so notifications can use it.
    if (isAuthenticated) void usersApi.updateMe({ preferredLanguage: code }).catch(() => {});
  };
  return (
    <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t("account.language")}: ${label}`} onPress={() => setOpen(true)} style={[s.button, { borderColor: colors.border, backgroundColor: colors.backgroundCard }]}>
        <Feather name="globe" size={16} color={colors.textSecondary} />
        <Text style={[s.label, { color: colors.textPrimary }]}>{label}</Text>
        <Feather name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t("cancel")}>
          <Pressable style={[s.card, { backgroundColor: colors.backgroundCard }]} onPress={() => {}}>
            <Text style={[s.title, { color: colors.textPrimary }]}>{t("account.language")}</Text>
            {LANGUAGES.map((l) => (
              <TouchableOpacity key={l.code} accessibilityRole="radio" accessibilityState={{ selected: language === l.code }} onPress={() => choose(l.code)} style={s.option}>
                <Text style={[s.optionText, { color: colors.textPrimary }]}>{l.label}</Text>
                {language === l.code ? <Feather name="check" size={20} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, minHeight: 40 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, borderRadius: 20, padding: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 8 },
  option: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionText: { fontFamily: "Inter_500Medium", fontSize: 16 },
});
