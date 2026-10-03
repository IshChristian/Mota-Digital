import { useCallback, useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { PassengerSettingsScreen } from "@/components/PassengerSettingsScreen";
import { useTheme } from "@/context/ThemeContext";
import { productionApi } from "@/services/api";

import { uploadToCloudinary } from "@/services/cloudinary";

export default function RideDisputes() {
  const { colors } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [plateNumber, setPlateNumber] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      productionApi
        .disputes()
        .then((r) => setItems(r.data.data || []))
        .catch(() => setMessage("Disputes could not be loaded. Please try again.")),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const attachEvidence = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      setMessage("Allow photo access to attach evidence.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    setBusy(true);
    setMessage("");
    try {
      const asset = result.assets[0];
      const url = await uploadToCloudinary(asset.uri, "mota-docs", asset.fileName || "evidence.jpg", asset.mimeType || "image/jpeg", asset.base64);
      setEvidence(url);
      setMessage("Evidence attached.");
    } catch (e: any) {
      setMessage(e?.response?.data?.message || e?.message || "Evidence upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    const normalizedPlate = plateNumber.trim().toUpperCase().replace(/\s+/g, " ");
    if (!normalizedPlate) {
      setMessage("Enter the verified plate number shown on the driver or vehicle.");
      return;
    }
    if (!description.trim()) {
      setMessage("Explain what happened so support can review the correct ride.");
      return;
    }
    try {
      setBusy(true);
      setMessage("");
      await productionApi.createDisputeByPlate(normalizedPlate, {
        category: "other",
        description: description.trim(),
        requestRefund: true,
        evidence: evidence ? [evidence] : [],
      });
      setPlateNumber("");
      setDescription("");
      setEvidence(null);
      setMessage("Your request was submitted. Support will review it.");
      await load();
    } catch (e: any) {
      setMessage(e?.response?.data?.message || "Request was not submitted. Check the plate number and try again.");
    } finally {
      setBusy(false);
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
        value={plateNumber}
        onChangeText={(value) => setPlateNumber(value.toUpperCase())}
        placeholder="Driver plate number (for example RAE 123 A)"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="Driver plate number"
      />
      <TextInput
        style={input}
        value={description}
        onChangeText={setDescription}
        placeholder="Explain what happened"
        multiline
        placeholderTextColor={colors.textSecondary}
      />
      <TouchableOpacity onPress={attachEvidence} disabled={busy} accessibilityRole="button" style={{ borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 12 }}>
        <Text style={{ color: colors.textPrimary }}>{evidence ? "Evidence photo attached · Change photo" : "Attach evidence photo (optional)"}</Text>
      </TouchableOpacity>
      {!!message && <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{message}</Text>}
      <TouchableOpacity
        onPress={submit}
        disabled={busy}
        style={{
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>
          {busy ? "Please wait…" : "Submit dispute and refund request"}
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
