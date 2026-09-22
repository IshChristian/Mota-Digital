import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { useTheme } from "@/context/ThemeContext";
import { productionApi } from "@/services/api";

export default function RideDisputes() {
  const { colors } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [rideId, setRideId] = useState("");
  const [description, setDescription] = useState("");
  const load = useCallback(
    () =>
      productionApi
        .disputes()
        .then((r) => setItems(r.data.data || []))
        .catch(() =>
          Alert.alert("Unavailable", "Disputes could not be loaded."),
        ),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const submit = async () => {
    try {
      await productionApi.createDispute(rideId.trim(), {
        category: "other",
        description: description.trim(),
        requestRefund: true,
      });
      setRideId("");
      setDescription("");
      await load();
    } catch (e: any) {
      Alert.alert(
        "Not submitted",
        e?.response?.data?.message || "Check the ride and try again.",
      );
    }
  };
  const input = {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    padding: 13,
    borderRadius: 12,
  } as const;
  return (
    <PassengerSettingsScreen title="Ride disputes & refunds">
      <TextInput
        style={input}
        value={rideId}
        onChangeText={setRideId}
        placeholder="Ride ID"
        placeholderTextColor={colors.textSecondary}
      />
      <TextInput
        style={input}
        value={description}
        onChangeText={setDescription}
        placeholder="Explain what happened"
        multiline
        placeholderTextColor={colors.textSecondary}
      />
      <TouchableOpacity
        onPress={submit}
        style={{
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>
          Submit dispute and refund request
        </Text>
      </TouchableOpacity>
      {items.map((item) => (
        <View
          key={item._id}
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
          }}
        >
          <Text
            style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold" }}
          >
            {item.category} · {item.status}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {item.description}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Refund: {item.refund?.status || "not requested"}
          </Text>
        </View>
      ))}
    </PassengerSettingsScreen>
  );
}
