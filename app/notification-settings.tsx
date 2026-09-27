import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { useTheme } from "@/context/ThemeContext";
import { productionApi } from "@/services/api";

const labels = {
  rides: "Ride updates",
  wallet: "Wallet activity",
  promotions: "Offers and promotions",
  security: "Security alerts",
} as const;
export default function NotificationSettings() {
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
      .catch(() => setFeedback("Notification preferences could not be loaded. Pull back and try again."));
  }, []);
  const change = async (key: keyof typeof labels, value: boolean) => {
    const previous = values;
    setValues({ ...values, [key]: value });
    try {
      await productionApi.updateNotificationPreferences({ [key]: value });
      setFeedback("Notification preferences saved.");
    } catch {
      setValues(previous);
      setFeedback("Changes were not saved. Please try again.");
    }
  };
  return (
    <PassengerSettingsScreen title="Notifications">
      {feedback ? <Text accessibilityRole="alert" style={{ color: colors.textPrimary, backgroundColor: colors.backgroundCard, padding: 12, borderRadius: 10 }}>{feedback}</Text> : null}
      {(["Operational", "Promotional"] as const).map((group) => <View key={group}>
        <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 6 }}>{group}</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{group === "Operational" ? "Ride, account, and security updates" : "Offers and news from MOTA"}</Text>
      {Object.entries(labels).filter(([key]) => group === "Promotional" ? key === "promotions" : key !== "promotions").map(([key, label]) => (
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
              {label}
            </Text>
            {key === "security" ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Recommended for account protection
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
