import { useT } from "@/context/I18nContext";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { useTheme } from "@/context/ThemeContext";
import { productionApi } from "@/services/api";

// Translation keys; resolved with t() when rendering.
const labels = {
  rides: "notif.ride_updates",
  wallet: "notif.wallet_activity",
  promotions: "notif.offers",
  security: "notif.security",
} as const;
export default function NotificationSettings() {
  const t = useT();
  const { colors } = useTheme();
  const [values, setValues] = useState<Record<keyof typeof labels, boolean>>({
    rides: true,
    wallet: true,
    promotions: false,
    security: true,
  });
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    productionApi
      .notificationPreferences()
      .then((r) => setValues((v) => ({ ...v, ...r.data.data })))
      .catch(() => setFeedback(t("notif.load_failed")));
  }, []);
  const change = async (key: keyof typeof labels, value: boolean) => {
    const previous = values;
    setValues({ ...values, [key]: value });
    try {
      await productionApi.updateNotificationPreferences({ [key]: value });
      setFeedback(t("notif.saved"));
    } catch {
      setValues(previous);
      setFeedback(t("notif.not_saved"));
    }
  };
  return (
    <PassengerSettingsScreen title={t("notif.title")}>
      {feedback ? <Text accessibilityRole="alert" style={{ color: colors.textPrimary, backgroundColor: colors.backgroundCard, padding: 12, borderRadius: 10 }}>{feedback}</Text> : null}
      {([t("notif.operational"), t("notif.promotional")] as const).map((group) => <View key={group}>
        <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 6 }}>{group}</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{group === t("notif.operational") ? t("notif.operational_desc") : t("notif.promotional_desc")}</Text>
      {Object.entries(labels).filter(([key]) => group === t("notif.promotional") ? key === "promotions" : key !== "promotions").map(([key, label]) => (
        <View
          key={key}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 14,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {t(label)}
            </Text>
            {key === "security" ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {t("notif.security_note")}
              </Text>
            ) : null}
          </View>
          <Switch
            value={values[key as keyof typeof labels]}
            onValueChange={(value) => change(key as keyof typeof labels, value)}
          />
        </View>
      ))}
      </View>)}
    </PassengerSettingsScreen>
  );
}
