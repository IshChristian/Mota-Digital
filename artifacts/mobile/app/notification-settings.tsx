import { useEffect, useState } from "react";
import { Alert, Switch, Text, View } from "react-native";
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
  useEffect(() => {
    productionApi
      .notificationPreferences()
      .then((r) => setValues((v) => ({ ...v, ...r.data.data })))
      .catch(() =>
        Alert.alert(
          "Unavailable",
          "Notification preferences could not be loaded.",
        ),
      );
  }, []);
  const change = async (key: keyof typeof labels, value: boolean) => {
    const previous = values;
    setValues({ ...values, [key]: value });
    try {
      await productionApi.updateNotificationPreferences({ [key]: value });
    } catch {
      setValues(previous);
      Alert.alert("Not saved", "Please retry.");
    }
  };
  return (
    <PassengerSettingsScreen title="Notifications">
      {Object.entries(labels).map(([key, label]) => (
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
    </PassengerSettingsScreen>
  );
}
