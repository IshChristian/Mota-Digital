import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { kycApi } from "@/services/api";
import { uploadToCloudinary } from "@/services/cloudinary";
import { useTheme } from "@/context/ThemeContext";
import { RwandaPhoneInput } from "@/components/RwandaPhoneInput";
import { DriverHeader } from "@/components/driver/DriverUI";
import { useAuth } from "@/context/AuthContext";

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
  ["technicalInspectionDocument", "Technical inspection certificate"],
] as const;
const optionalDriverDocuments = [["vocationalCardDocument", "Driver vocational card (optional)"]] as const;

export function RoleKycScreen({ kind }: { kind: Kind }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = styles(colors);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("not_submitted");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [dateField, setDateField] = useState<string | null>(null);
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const dateValue = (key: string) => {
    const value = form[key] ? new Date(form[key].slice(0, 10) + "T12:00:00") : today;
    return Number.isNaN(value.getTime()) || value < today ? today : value;
  };
  const chooseDate = (_event: unknown, value: Date) => {
    if (Platform.OS !== "ios") setDateField(null);
    if (!dateField) return;
    set(dateField, `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`);
  };
  useEffect(() => {
    kycApi
      .getMine()
      .then((r) => {
        if (r.data.kycType !== kind)
          throw new Error(`This screen is for ${kind} KYC only`);
        const data = r.data.data || {};
        setForm({ nationalIdNumber: user?.nationalId || "",
          ...Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === "string")) as Record<string, string>,
        });
        setStatus(data.status || "not_submitted");
        setRemarks(data.remarks || "");
      })
      .catch((e) => setMessage(e?.response?.data?.message || e.message))
      .finally(() => setBusy(false));
  }, [kind, user?.nationalId]);
  const set = (key: string, value: string) =>
    setForm((v) => ({ ...v, [key]: value }));
  const pick = async (key: string) => {
    if (busy) return;
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
    setUploadingKey(key);
    setMessage("");
    try {
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error("No image was selected. Choose a photo and retry.");
      const url = await uploadToCloudinary(asset.uri, "mota-docs", asset.fileName || `${key}.jpg`, asset.mimeType || "image/jpeg");
      set(key, url);
      const label = [...commonDocuments, ...driverDocuments, ...optionalDriverDocuments].find(([field]) => field === key)?.[1] || "Document";
      setMessage(`${label} uploaded successfully. Submit verification to save it for review.`);
    } catch (e: any) {
      setMessage(e?.message || "Document upload failed. Please retry.");
    } finally {
      setUploadingKey(null);
      setBusy(false);
    }
  };
  const submit = async () => {
    const docs = [...commonDocuments, ...(kind === "driver" ? driverDocuments : [])];
    const missing = docs.find(([key]) => !form[key]);
    if (!form.nationalIdNumber?.trim() || missing) {
      setMessage(`Complete National ID number and ${missing?.[1] || "required documents"} before submitting.`);
      return;
    }
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
      <Text style={s.notice}>Name: {user?.firstName} {user?.lastName} · ID registered: {user?.nationalId || "Use your registered ID"}</Text>
      <Text style={s.docTitle}>National ID number *</Text>
      <TextInput
        style={s.input}
        placeholder="National ID number"
        placeholderTextColor={colors.textSecondary}
        value={form.nationalIdNumber || ""}
        onChangeText={(v) => set("nationalIdNumber", v)}
      />
      {kind === "passenger" ? (
        <>
          <Text style={s.fieldLabel}>Residential address (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="Residential address (optional)"
            placeholderTextColor={colors.textSecondary}
            value={form.residentialAddress || ""}
            onChangeText={(v) => set("residentialAddress", v)}
          />
          <Text style={s.fieldLabel}>Emergency contact name (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="Emergency contact name (optional)"
            placeholderTextColor={colors.textSecondary}
            value={form.emergencyContactName || ""}
            onChangeText={(v) => set("emergencyContactName", v)}
          />
          <Text style={s.fieldLabel}>Emergency contact phone (optional)</Text>
          <RwandaPhoneInput value={form.emergencyContactPhone || ""} onChangeText={(v) => set("emergencyContactPhone", v)} accessibilityLabel="Emergency contact phone number" />
        </>
      ) : (
        <>
          <Text style={s.fieldLabel}>Driving licence number *</Text>
          <TextInput
            style={s.input}
            placeholder="Driving licence number"
            placeholderTextColor={colors.textSecondary}
            value={form.drivingLicenseNumber || ""}
            onChangeText={(v) => set("drivingLicenseNumber", v)}
          />
          <Text style={s.fieldLabel}>Transport permit number *</Text>
          <TextInput
            style={s.input}
            placeholder="Transport permit number"
            placeholderTextColor={colors.textSecondary}
            value={form.transportPermitNumber || ""}
            onChangeText={(v) => set("transportPermitNumber", v)}
          />
          <Text style={s.fieldLabel}>Vehicle plate number *</Text>
          <TextInput
            style={s.input}
            placeholder="Vehicle plate number"
            placeholderTextColor={colors.textSecondary}
            value={form.plateNumber || ""}
            onChangeText={(v) => set("plateNumber", v)}
          />
          <Text style={s.section}>Vehicle type</Text>
          <View style={s.choices}>
            {(["car", "moto"] as const).map((value) => (
              <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: form.vehicleType === value }} style={[s.choice, form.vehicleType === value && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}24` }]} onPress={() => set("vehicleType", value)}>
                <Text style={s.docTitle}>{value === "car" ? "Car" : "Moto"}{form.vehicleType === value ? "  ✓ Selected" : ""}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.section}>Power type</Text>
          <View style={s.choices}>
            {(["electric", "diesel", "petrol"] as const).map((value) => (
              <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: form.powertrain === value }} style={[s.choice, form.powertrain === value && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}24` }]} onPress={() => set("powertrain", value)}>
                <Text style={s.docTitle}>{value[0].toUpperCase() + value.slice(1)}{form.powertrain === value ? "  ✓ Selected" : ""}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldLabel}>Cooperative name (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="Cooperative name (optional)"
            placeholderTextColor={colors.textSecondary}
            value={form.cooperativeName || ""}
            onChangeText={(v) => set("cooperativeName", v)}
          />
          {([
            ["drivingLicenseExpiresAt", "Driving licence expiry"],
            ["transportPermitExpiresAt", "Transport permit expiry"],
            ["insuranceExpiresAt", "Insurance expiry"],
            ["vehicleRegistrationExpiresAt", "Vehicle registration expiry"],
            ["technicalInspectionExpiresAt", "Technical inspection expiry"],
            ["vocationalCardExpiresAt", "Vocational card expiry (if provided)"],
          ] as const).map(([key, label]) => (
            <View key={key}>
              <Text style={s.fieldLabel}>{label}{key === "vocationalCardExpiresAt" ? "" : " *"}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choose ${label}`} style={[s.input, s.dateButton]} onPress={() => setDateField(key)}>
                <Text style={{ color: form[key] ? colors.textPrimary : colors.textSecondary }}>{form[key]?.slice(0, 10) || "Select expiry date"}</Text>
                <Feather name="calendar" size={19} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
          {dateField ? <View>
            <DateTimePicker value={dateValue(dateField)} mode="date" minimumDate={today} onValueChange={chooseDate} onDismiss={() => setDateField(null)} />
            {Platform.OS === "ios" ? <TouchableOpacity accessibilityRole="button" onPress={() => setDateField(null)} style={s.dateDone}><Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>Done</Text></TouchableOpacity> : null}
          </View> : null}
        </>
      )}
      <Text style={s.section}>Required documents</Text>
      <Text style={s.notice}>Upload clear images of both sides of your ID and a current selfie. Drivers also need the documents listed below.</Text>
      {docs.map(([key, label]) => (
        <TouchableOpacity
          key={key}
          style={s.doc}
          onPress={() => pick(key)}
          disabled={busy || status === "approved"}
        >
          {uploadingKey === key ? <ActivityIndicator color={colors.primary} /> : <Feather
            name={form[key] ? "check-circle" : "upload"}
            size={20}
            color={form[key] ? colors.primary : colors.textSecondary}
          />}
          <View style={{ flex: 1 }}>
            <Text style={s.docTitle}>{label}</Text>
            <Text style={s.docSub}>
              {uploadingKey === key ? "Uploading to Cloudinary…" : form[key]
                ? "Uploaded — tap to replace"
                : "Tap to select and upload"}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      {kind === "driver" ? <>
        <Text style={s.section}>Optional document</Text>
        {optionalDriverDocuments.map(([key, label]) => (
          <TouchableOpacity key={key} style={s.doc} onPress={() => pick(key)} disabled={busy || status === "approved"}>
            {uploadingKey === key ? <ActivityIndicator color={colors.primary} /> : <Feather name={form[key] ? "check-circle" : "upload"} size={20} color={form[key] ? colors.primary : colors.textSecondary} />}
            <View style={{ flex: 1 }}><Text style={s.docTitle}>{label}</Text><Text style={s.docSub}>{uploadingKey === key ? "Uploading to Cloudinary…" : form[key] ? "Uploaded — tap to replace" : "Tap to select and upload"}</Text></View>
          </TouchableOpacity>
        ))}
      </> : null}
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
    fieldLabel: { color: c.textPrimary, fontFamily: "Inter_600SemiBold", marginBottom: 7, marginTop: 5 },
    dateButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dateDone: { alignSelf: "flex-end", padding: 12 },
    choices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    choice: { borderWidth: 1, borderColor: c.border, backgroundColor: c.backgroundCard, borderRadius: 12, padding: 12 },
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
