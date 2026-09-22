import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { kycApi, uploadsApi } from "@/services/api";
import { useTheme } from "@/context/ThemeContext";
import { DriverHeader } from "@/components/driver/DriverUI";

type Kind = "driver" | "passenger";
const commonDocuments = [
  ["nationalIdFront", "National ID — front"],
  ["nationalIdBack", "National ID — back"],
  ["selfie", "Verification selfie"],
] as const;
const driverDocuments = [
  ["drivingLicenseDocument", "Driving licence"],
  ["transportPermitDocument", "Transport permit"],
  ["insuranceDocument", "Insurance certificate"],
  ["vehicleRegistrationDocument", "Vehicle registration"],
] as const;

export function RoleKycScreen({ kind }: { kind: Kind }) {
  const { colors } = useTheme();
  const s = styles(colors);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("not_submitted");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    kycApi
      .getMine()
      .then((r) => {
        if (r.data.kycType !== kind)
          throw new Error(`This screen is for ${kind} KYC only`);
        const data = r.data.data || {};
        setForm(
          Object.fromEntries(
            Object.entries(data).filter(([, v]) => typeof v === "string"),
          ) as Record<string, string>,
        );
        setStatus(data.status || "not_submitted");
        setRemarks(data.remarks || "");
      })
      .catch((e) => setMessage(e?.response?.data?.message || e.message))
      .finally(() => setBusy(false));
  }, [kind]);
  const set = (key: string, value: string) =>
    setForm((v) => ({ ...v, [key]: value }));
  const pick = async (key: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      setMessage("Photo-library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;
    setBusy(true);
    try {
      const asset = result.assets[0];
      const body = new FormData();
      body.append("file", {
        uri: asset.uri,
        name: asset.fileName || `${key}.jpg`,
        type: asset.mimeType || "image/jpeg",
      } as any);
      const response = await uploadsApi.upload(body);
      set(key, response.data.data.url);
      setMessage(`${key} uploaded.`);
    } catch (e: any) {
      setMessage(e?.response?.data?.message || "Document upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await kycApi.submitMine(form);
      setStatus(response.data.data.status);
      setMessage(response.data.message);
    } catch (e: any) {
      setMessage(e?.response?.data?.message || "KYC submission failed.");
    } finally {
      setBusy(false);
    }
  };
  const docs = [
    ...commonDocuments,
    ...(kind === "driver" ? driverDocuments : []),
  ];
  if (busy && !Object.keys(form).length)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <DriverHeader
        back
        title={`${kind === "driver" ? "Driver" : "Passenger"} verification`}
        subtitle={`Status: ${status.replace("_", " ")}`}
      />
      {remarks ? <Text style={s.notice}>Review note: {remarks}</Text> : null}
      {message ? <Text style={s.notice}>{message}</Text> : null}
      <Text style={s.section}>Identity information</Text>
      <TextInput
        style={s.input}
        placeholder="National ID number"
        placeholderTextColor={colors.textSecondary}
        value={form.nationalIdNumber || ""}
        onChangeText={(v) => set("nationalIdNumber", v)}
      />
      {kind === "passenger" ? (
        <>
          <TextInput
            style={s.input}
            placeholder="Residential address (optional)"
            placeholderTextColor={colors.textSecondary}
            value={form.residentialAddress || ""}
            onChangeText={(v) => set("residentialAddress", v)}
          />
          <TextInput
            style={s.input}
            placeholder="Emergency contact name (optional)"
            placeholderTextColor={colors.textSecondary}
            value={form.emergencyContactName || ""}
            onChangeText={(v) => set("emergencyContactName", v)}
          />
          <TextInput
            style={s.input}
            placeholder="Emergency contact phone (optional)"
            placeholderTextColor={colors.textSecondary}
            value={form.emergencyContactPhone || ""}
            onChangeText={(v) => set("emergencyContactPhone", v)}
          />
        </>
      ) : (
        <>
          <TextInput
            style={s.input}
            placeholder="Driving licence number"
            placeholderTextColor={colors.textSecondary}
            value={form.drivingLicenseNumber || ""}
            onChangeText={(v) => set("drivingLicenseNumber", v)}
          />
          <TextInput
            style={s.input}
            placeholder="Transport permit number"
            placeholderTextColor={colors.textSecondary}
            value={form.transportPermitNumber || ""}
            onChangeText={(v) => set("transportPermitNumber", v)}
          />
          <TextInput
            style={s.input}
            placeholder="Vehicle plate number"
            placeholderTextColor={colors.textSecondary}
            value={form.plateNumber || ""}
            onChangeText={(v) => set("plateNumber", v)}
          />
          <TextInput
            style={s.input}
            placeholder="Cooperative name (optional)"
            placeholderTextColor={colors.textSecondary}
            value={form.cooperativeName || ""}
            onChangeText={(v) => set("cooperativeName", v)}
          />
        </>
      )}
      <Text style={s.section}>Required documents</Text>
      {docs.map(([key, label]) => (
        <TouchableOpacity
          key={key}
          style={s.doc}
          onPress={() => pick(key)}
          disabled={status === "approved"}
        >
          <Feather
            name={form[key] ? "check-circle" : "upload"}
            size={20}
            color={form[key] ? colors.primary : colors.textSecondary}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.docTitle}>{label}</Text>
            <Text style={s.docSub}>
              {form[key]
                ? "Uploaded — tap to replace"
                : "Tap to select and upload"}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[s.submit, status === "approved" && { opacity: 0.5 }]}
        onPress={submit}
        disabled={busy || status === "approved"}
      >
        <Text style={s.submitText}>
          {busy
            ? "Submitting…"
            : status === "approved"
              ? "KYC approved"
              : "Submit for review"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const styles = (c: any) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 18, paddingTop: 52, paddingBottom: 80 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
    },
    header: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      marginBottom: 20,
    },
    back: { padding: 8 },
    title: { fontSize: 23, fontFamily: "Inter_700Bold", color: c.textPrimary },
    sub: { color: c.textSecondary, marginTop: 2, textTransform: "capitalize" },
    notice: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.backgroundCard,
      color: c.textPrimary,
      marginBottom: 12,
    },
    section: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: c.textPrimary,
      marginTop: 12,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 13,
      color: c.textPrimary,
      marginBottom: 10,
      backgroundColor: c.backgroundCard,
    },
    doc: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      backgroundColor: c.backgroundCard,
    },
    docTitle: { color: c.textPrimary, fontFamily: "Inter_600SemiBold" },
    docSub: { color: c.textSecondary, fontSize: 12, marginTop: 3 },
    submit: {
      backgroundColor: c.primary,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      marginTop: 18,
    },
    submitText: { fontFamily: "Inter_700Bold", color: "#fff" },
  });
