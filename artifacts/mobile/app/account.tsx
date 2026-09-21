import { useState } from "react";
import {
  Alert,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { usersApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function AccountScreen() {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const exportData = async () => {
    setBusy(true);
    try {
      const r = await usersApi.exportMyData();
      await Share.share({
        title: "My MOTA data",
        message: JSON.stringify(r.data, null, 2),
      });
    } catch (e: any) {
      Alert.alert(
        "Export failed",
        e?.response?.data?.message || "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    Alert.alert(
      "Delete account",
      "This anonymizes your personal profile. Active rides, loans, and wallet funds must be resolved first.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await usersApi.deleteAccount(password);
              await logout();
            } catch (e: any) {
              Alert.alert(
                "Unable to delete account",
                e?.response?.data?.message || "Please try again.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  return (
    <PassengerSettingsScreen title="Account and data">
      <TouchableOpacity
        disabled={busy}
        onPress={exportData}
        style={[s.outline, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.textPrimary }}>
          Export my account data
        </Text>
      </TouchableOpacity>
      <Text style={{ color: colors.textSecondary }}>
        Enter your password to confirm account deletion.
      </Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.textTertiary}
        style={[
          s.input,
          { color: colors.textPrimary, borderColor: colors.border },
        ]}
      />
      <TouchableOpacity
        disabled={busy || !password}
        onPress={remove}
        style={s.delete}
      >
        <Text style={s.deleteText}>Delete my account</Text>
      </TouchableOpacity>
    </PassengerSettingsScreen>
  );
}
const s = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 14, padding: 15 },
  outline: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
  },
  delete: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#B91C1C",
  },
  deleteText: { color: "#fff", fontFamily: "Inter_700Bold" },
});
