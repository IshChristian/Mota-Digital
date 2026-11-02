import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Alert } from "@/components/GlobalAlert";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/context/I18nContext";
import { getApiErrorMessage, placesApi } from "@/services/api";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";

type Saved = { _id: string; label: string; name: string; latitude: number; longitude: number };

export default function SavedPlaces() {
  const { colors } = useTheme();
  const t = useT();
  const [places, setPlaces] = useState<Saved[] | null>(null);

  useEffect(() => {
    placesApi.list().then((r) => setPlaces(r.data.data.saved)).catch((e) => { setPlaces([]); Alert.alert(t("error"), getApiErrorMessage(e)); });
  }, []);

  const remove = (p: Saved) => Alert.alert(t("account.remove"), t("account.remove_place_confirm", { name: p.label }), [
    { text: t("cancel"), style: "cancel" },
    { text: t("account.remove"), style: "destructive", onPress: async () => {
      try { setPlaces((await placesApi.remove(p._id)).data.data); } catch (e) { Alert.alert(t("error"), getApiErrorMessage(e)); }
    } },
  ]);

  return (
    <PassengerSettingsScreen title={t("account.saved_places")}>
      {places === null ? <ActivityIndicator color={colors.primary} /> : places.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>{t("account.no_places")}</Text>
      ) : places.map((p) => (
        <View key={p._id} style={[styles.row, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Feather name={p.label.toLowerCase() === "home" ? "home" : p.label.toLowerCase() === "work" ? "briefcase" : "star"} size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>{p.label}</Text>
            <Text style={{ color: colors.textSecondary }} numberOfLines={1}>{p.name}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t("account.remove")} ${p.label}`} onPress={() => remove(p)} style={{ padding: 10 }}>
            <Feather name="trash-2" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
    </PassengerSettingsScreen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 } });
