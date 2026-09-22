import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { useTheme } from "@/context/ThemeContext";
import { productionApi } from "@/services/api";

export default function Sessions() {
  const { colors } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const load = useCallback(
    () =>
      productionApi
        .sessions()
        .then((r) => setItems(r.data.data || []))
        .catch(() =>
          Alert.alert("Unavailable", "Active sessions could not be loaded."),
        ),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <PassengerSettingsScreen title="Active sessions">
      <Text style={{ color: colors.textSecondary }}>
        Revoke devices you no longer recognize.
      </Text>
      {items.map((item) => (
        <View
          key={item.sessionId}
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            gap: 5,
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            {item.userAgent || "Unknown device"}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Last active {new Date(item.lastSeenAt).toLocaleString()} ·{" "}
            {item.ipAddress || "Unknown network"}
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await productionApi.revokeSession(item.sessionId);
              await load();
            }}
          >
            <Text style={{ color: colors.error }}>Revoke session</Text>
          </TouchableOpacity>
        </View>
      ))}
    </PassengerSettingsScreen>
  );
}
