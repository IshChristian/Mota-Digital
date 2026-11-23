import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
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
import { chooseUploadFile } from "@/services/uploadSource";
import { Alert } from "@/components/GlobalAlert";
import DateTimePicker from "@/components/ui/DateTimePicker";
import { kycApi } from "@/services/api";
import { uploadToCloudinary } from "@/services/cloudinary";
import { useTheme } from "@/context/ThemeContext";
import { RwandaPhoneInput } from "@/components/RwandaPhoneInput";
import { DriverHeader } from "@/components/driver/DriverUI";
import { useT } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";

type Kind = "driver" | "passenger";
const commonDocuments = [
  ["nationalIdFront", "kyc.doc_nationalIdFront"],
  ["nationalIdBack", "kyc.doc_nationalIdBack"],
  ["selfie", "kyc.doc_selfie"],
] as const;
const driverDocuments = [
  ["drivingLicenseDocument", "kyc.doc_drivingLicenseDocument"],
  ["transportPermitDocument", "kyc.doc_transportPermitDocument"],
  ["insuranceDocument", "kyc.doc_insuranceDocument"],
  ["vehicleRegistrationDocument", "kyc.doc_vehicleRegistrationDocument"],
  ["technicalInspectionDocument", "kyc.doc_technicalInspectionDocument"],
] as const;
const optionalDriverDocuments = [["vocationalCardDocument", "kyc.doc_vocationalCardDocument"]] as const;
// Each required document's expiry field (renewal opens 30 days before expiry).
const EXPIRY_OF: Record<string, string> = {
  drivingLicenseDocument: "drivingLicenseExpiresAt",
  transportPermitDocument: "transportPermitExpiresAt",
  insuranceDocument: "insuranceExpiresAt",
  vehicleRegistrationDocument: "vehicleRegistrationExpiresAt",
  technicalInspectionDocument: "technicalInspectionExpiresAt",
};
type Renewal = { due: boolean; expired: Array<{ expiryField: string; documentField: string; expiresAt: string | null }>; expiringSoon: Array<{ expiryField: string; documentField: string; expiresAt: string }>; windowDays: number };

export function RoleKycScreen({ kind }: { kind: Kind }) {
  const t = useT();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = styles(colors);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("not_submitted");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [newUploads, setNewUploads] = useState<Record<string, boolean>>({});
  const [dateField, setDateField] = useState<string | null>(null);
  const [renewal, setRenewal] = useState<Renewal | null>(null);
  // The record exactly as loaded. Renewal is decided from these saved dates, not from the
  // form being edited (picking the new expiry date must not re-lock the screen).
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  const lockedRef = useRef(false);
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
        setRenewal(r.data.renewal || null);
        setLoaded(Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === "string")) as Record<string, string>);
      })
      .catch((e) => setMessage(e?.response?.data?.message || e.message))
      .finally(() => setBusy(false));
  }, [kind, user?.nationalId]);
  const set = (key: string, value: string) =>
    setForm((v) => ({ ...v, [key]: value }));
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const pick = async (key: string) => {
    if (busy) return;
    if (lockedRef.current) {
      // Never ignore a tap silently: say why the document can't be changed.
      Alert.alert(t("kyc.locked_title"), t("kyc.locked_body"));
      return;
    }
    try {
      setUploadErrors((previous) => ({ ...previous, [key]: "" }));
      const label = [...commonDocuments, ...driverDocuments, ...optionalDriverDocuments].find(([field]) => field === key)?.[1];
      const name = t(label || "kyc.required_docs");
      const asset = await chooseUploadFile(name);
      if (!asset) return;
      setBusy(true);
      setUploadingKey(key);
      if (!asset?.uri) throw new Error("No file was selected. Choose a document and retry.");
      const url = await uploadToCloudinary(asset.uri, "mota-docs", asset.name || `${key}.bin`, asset.mimeType || "application/octet-stream");
      set(key, url);
      setFileNames(previous => ({...previous,[key]:asset.name}));
      setNewUploads((previous) => ({ ...previous, [key]: true }));
      setMessage(t("kyc.upload_ok", { document: name }));
    } catch (e: any) {
      const error = e?.message || t("kyc.upload_error");
      setUploadErrors((previous) => ({ ...previous, [key]: error }));
      setMessage(error);
    } finally {
      setUploadingKey(null);
      setBusy(false);
    }
  };
  const submit = async () => {
    const docs = [...commonDocuments, ...(kind === "driver" ? driverDocuments : [])];
    const missing = docs.find(([key]) => !form[key]);
    if (!form.nationalIdNumber?.trim() || missing) {
      const fields = [!form.nationalIdNumber?.trim() && t("kyc.nid"), missing && t(missing[1])].filter(Boolean).join(", ");
      setMessage(t("kyc.missing_body", { fields }));
      Alert.alert(t("kyc.missing_title"), t("kyc.missing_body", { fields }));
      return;
    }
    if (kind === "driver") {
      const stale = docs.find(([key]) => EXPIRY_OF[key] && (!form[EXPIRY_OF[key] || "vocationalCardExpiresAt"] || new Date(form[EXPIRY_OF[key] || "vocationalCardExpiresAt"].slice(0, 10) + "T23:59:59") < new Date()));
      if (stale) {
        setMessage(t("kyc.stale_body", { document: t(stale[1]) }));
        Alert.alert(t("kyc.new_expiry_title"), t("kyc.stale_body", { document: t(stale[1]) }));
        return;
      }
      if (form.vocationalCardDocument && form.vocationalCardExpiresAt && new Date(form.vocationalCardExpiresAt.slice(0, 10) + "T23:59:59") < new Date()) {
        setMessage(t("kyc.stale_body", { document: t("kyc.doc_vocationalCardDocument") }));
        return;
      }
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await kycApi.submitMine(form);
      setStatus(response.data.data.status);
      setRenewal(null);
      setLoaded(Object.fromEntries(Object.entries(response.data.data || {}).filter(([, v]) => typeof v === "string")) as Record<string, string>);
      setNewUploads({});
      setMessage(t("kyc.sent_body"));
      Alert.alert(t("kyc.sent_title"), t("kyc.sent_body"));
    } catch (e: any) {
      const text = e?.response?.data?.message || t("kyc.submit_failed");
      setMessage(text);
      Alert.alert(t("kyc.submit_failed_title"), text);
    } finally {
      setBusy(false);
    }
  };
  const docs = [
    ...commonDocuments,
    ...(kind === "driver" ? driverDocuments : []),
  ];
  // Expiry worked out from the document dates themselves, so the screen unlocks even if the
  // server doesn't report renewal (older backend). The vocational card counts when provided.
  const localRenewal = (() => {
    if (kind !== "driver" || status !== "approved") return null;
    const now = Date.now(), soon = now + 30 * 86400000;
    const fields: Array<[string, string]> = [...Object.entries(EXPIRY_OF), ...(loaded.vocationalCardDocument ? [["vocationalCardDocument", "vocationalCardExpiresAt"] as [string, string]] : [])];
    const expired: Renewal["expired"] = [], expiringSoon: Renewal["expiringSoon"] = [];
    for (const [documentField, expiryField] of fields) {
      const at = loaded[expiryField] ? new Date(loaded[expiryField]).getTime() : NaN;
      if (!Number.isFinite(at) || at <= now) expired.push({ expiryField, documentField, expiresAt: loaded[expiryField] || null });
      else if (at <= soon) expiringSoon.push({ expiryField, documentField, expiresAt: loaded[expiryField] });
    }
    return { due: expired.length + expiringSoon.length > 0, expired, expiringSoon, windowDays: 30 } as Renewal;
  })();
  const effectiveRenewal = renewal?.due ? renewal : localRenewal;
  // Approved KYC is read-only unless a driver document has expired or expires soon.
  const renewing = status === "approved" && Boolean(effectiveRenewal?.due);
  const locked = status === "approved" && !renewing;
  lockedRef.current = locked;
  const expiredDocs = new Set((effectiveRenewal?.expired || []).map((d) => d.documentField));
  const expiringDocs = new Set((effectiveRenewal?.expiringSoon || []).map((d) => d.documentField));
  const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : t("kyc.unknown_date"));
  const documentCard = ([key, labelKey]: readonly [string, string]) => { const label = t(labelKey); return (
    <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`${label}: ${uploadErrors[key] ? t("kyc.upload_error") : uploadingKey === key ? t("kyc.uploading") : form[key] ? t("kyc.uploaded") : t("kyc.tap_upload")}`} style={[s.doc, uploadErrors[key] ? s.docError : form[key] ? s.docUploaded : null]} onPress={() => pick(key)} disabled={busy}>
      {uploadingKey === key ? <ActivityIndicator color={colors.primary} /> : form[key] ? <Feather name="file-text" size={24} color={colors.primary} /> : <Feather name={uploadErrors[key] ? "alert-circle" : "upload"} size={22} color={uploadErrors[key] ? cError : colors.textSecondary} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.docTitle}>{label}</Text>
        {fileNames[key] ? <Text style={s.docSub}>{fileNames[key]}</Text> : null}
        <Text style={[s.docSub, uploadErrors[key] ? s.errorText : form[key] ? s.successText : null]}>
          {!newUploads[key] && expiredDocs.has(key) ? t("kyc.doc_expired", { date: day(loaded[EXPIRY_OF[key] || "vocationalCardExpiresAt"]) }) : !newUploads[key] && expiringDocs.has(key) ? t("kyc.doc_expiring", { date: day(loaded[EXPIRY_OF[key] || "vocationalCardExpiresAt"]) }) : uploadingKey === key ? t("kyc.uploading") : uploadErrors[key] ? t("kyc.upload_failed", { error: uploadErrors[key] }) : form[key] ? newUploads[key] ? t("kyc.upload_new") : t("kyc.uploaded") : t("kyc.tap_upload")}
        </Text>
      </View>
    </TouchableOpacity>
  ); };
  const cError = colors.error || "#DC2626";
  if (busy && !Object.keys(form).length)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return (
    <ScrollView style={s.page} contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}>
      <DriverHeader
        back
        title={t(kind === "driver" ? "kyc.title_driver" : "kyc.title_passenger")}
        subtitle={t("kyc.status", { status: t(`kyc.st_${status}`) })}
      />
      {remarks ? <Text style={s.notice}>{t("kyc.review_note", { note: remarks })}</Text> : null}
      {message ? <Text style={s.notice}>{message}</Text> : null}
      <Text style={s.section}>{t("kyc.identity")}</Text>
      <Text style={s.notice}>{t("kyc.registered", { name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(), id: user?.nationalId || t("kyc.use_id") })}</Text>
      <Text style={s.docTitle}>{t("kyc.nid")} *</Text>
      <TextInput
        style={s.input}
        placeholder={t("kyc.nid")}
        placeholderTextColor={colors.textSecondary}
        value={form.nationalIdNumber || ""}
        onChangeText={(v) => set("nationalIdNumber", v)}
      />
      {kind === "passenger" ? (
        <>
          <Text style={s.fieldLabel}>{t("kyc.address")}</Text>
          <TextInput
            style={s.input}
            placeholder={t("kyc.address")}
            placeholderTextColor={colors.textSecondary}
            value={form.residentialAddress || ""}
            onChangeText={(v) => set("residentialAddress", v)}
          />
          <Text style={s.fieldLabel}>{t("kyc.ec_name")}</Text>
          <TextInput
            style={s.input}
            placeholder={t("kyc.ec_name")}
            placeholderTextColor={colors.textSecondary}
            value={form.emergencyContactName || ""}
            onChangeText={(v) => set("emergencyContactName", v)}
          />
          <Text style={s.fieldLabel}>{t("kyc.ec_phone")}</Text>
          <RwandaPhoneInput value={form.emergencyContactPhone || ""} onChangeText={(v) => set("emergencyContactPhone", v)} accessibilityLabel={t("kyc.ec_phone")} />
        </>
      ) : (
        <>
          <Text style={s.fieldLabel}>{t("kyc.licence_no")} *</Text>
          <TextInput
            style={s.input}
            placeholder={t("kyc.licence_no")}
            placeholderTextColor={colors.textSecondary}
            value={form.drivingLicenseNumber || ""}
            onChangeText={(v) => set("drivingLicenseNumber", v)}
          />
          <Text style={s.fieldLabel}>{t("kyc.permit_no")} *</Text>
          <TextInput
            style={s.input}
            placeholder={t("kyc.permit_no")}
            placeholderTextColor={colors.textSecondary}
            value={form.transportPermitNumber || ""}
            onChangeText={(v) => set("transportPermitNumber", v)}
          />
          <Text style={s.fieldLabel}>{t("kyc.plate")} *</Text>
          <TextInput
            style={s.input}
            placeholder={t("kyc.plate")}
            placeholderTextColor={colors.textSecondary}
            value={form.plateNumber || ""}
            onChangeText={(v) => set("plateNumber", v)}
          />
          <Text style={s.section}>{t("kyc.vehicle_type")}</Text>
          <View style={s.choices}>
            {(["car", "moto"] as const).map((value) => (
              <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: form.vehicleType === value }} style={[s.choice, form.vehicleType === value && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}24` }]} onPress={() => set("vehicleType", value)}>
                <Text style={s.docTitle}>{t(`kyc.${value}`)}{form.vehicleType === value ? `  ✓ ${t("kyc.selected")}` : ""}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.section}>{t("kyc.power_type")}</Text>
          <View style={s.choices}>
            {(["electric", "diesel", "petrol"] as const).map((value) => (
              <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: form.powertrain === value }} style={[s.choice, form.powertrain === value && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}24` }]} onPress={() => set("powertrain", value)}>
                <Text style={s.docTitle}>{t(`kyc.${value}`)}{form.powertrain === value ? `  ✓ ${t("kyc.selected")}` : ""}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldLabel}>{t("kyc.coop")}</Text>
          <TextInput
            style={s.input}
            placeholder={t("kyc.coop")}
            placeholderTextColor={colors.textSecondary}
            value={form.cooperativeName || ""}
            onChangeText={(v) => set("cooperativeName", v)}
          />
          {([
            ["drivingLicenseExpiresAt", "kyc.doc_drivingLicenseDocument"],
            ["transportPermitExpiresAt", "kyc.doc_transportPermitDocument"],
            ["insuranceExpiresAt", "kyc.doc_insuranceDocument"],
            ["vehicleRegistrationExpiresAt", "kyc.doc_vehicleRegistrationDocument"],
            ["technicalInspectionExpiresAt", "kyc.doc_technicalInspectionDocument"],
            ["vocationalCardExpiresAt", "kyc.doc_vocationalCardDocument"],
          ] as const).map(([key, docKey]) => { const label = t("kyc.expiry", { document: t(docKey) }); return (
            <View key={key}>
              <Text style={s.fieldLabel}>{label}{key === "vocationalCardExpiresAt" ? "" : " *"}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} style={[s.input, s.dateButton]} onPress={() => setDateField(key)}>
                <Text style={{ color: form[key] ? colors.textPrimary : colors.textSecondary }}>{form[key]?.slice(0, 10) || t("kyc.select_expiry")}</Text>
                <Feather name="calendar" size={19} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ); })}
          {dateField ? <View>
            <DateTimePicker value={dateValue(dateField)} mode="date" minimumDate={today} onValueChange={chooseDate} onDismiss={() => setDateField(null)} />
            {Platform.OS === "ios" ? <TouchableOpacity accessibilityRole="button" onPress={() => setDateField(null)} style={s.dateDone}><Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{t("kyc.done")}</Text></TouchableOpacity> : null}
          </View> : null}
        </>
      )}
      {renewing ? (
        <View accessibilityRole="alert" style={{ borderWidth: 1, borderColor: cError, borderRadius: 14, padding: 14, marginTop: 16, gap: 6, backgroundColor: `${cError}14` }}>
          <Text style={[s.docTitle, { color: cError }]}>{effectiveRenewal!.expired.length ? t("kyc.renew_needed") : t("kyc.renew_soon")}</Text>
          {[...effectiveRenewal!.expired, ...effectiveRenewal!.expiringSoon].map((d) => {
            const label = t(`kyc.doc_${d.documentField}`);
            return <Text key={d.documentField} style={s.docSub}>• {t(effectiveRenewal!.expired.some((x) => x.documentField === d.documentField) ? "kyc.expired_on" : "kyc.expires_on", { document: label, date: day(d.expiresAt) })}</Text>;
          })}
          <Text style={s.docSub}>{t("kyc.renew_help")}</Text>
        </View>
      ) : null}
      <Text style={s.section}>{t("kyc.required_docs")}</Text>
      <Text style={s.notice}>{t("kyc.required_help")}</Text>
      {docs.map(documentCard)}
      {kind === "driver" ? <>
        <Text style={s.section}>{t("kyc.optional_doc")}</Text>
        {optionalDriverDocuments.map(documentCard)}
      </> : null}
      <TouchableOpacity
        style={[s.submit, locked && { opacity: 0.5 }]}
        onPress={submit}
        disabled={busy || locked}
      >
        <Text style={s.submitText}>
          {busy
            ? t("kyc.submitting")
            : renewing
              ? t("kyc.submit_renewal")
              : status === "approved"
                ? t("kyc.is_approved")
                : t("kyc.submit")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const styles = (c: any) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.background },
    content: { padding: 18, paddingTop: 52, paddingBottom: 120, width: "100%", maxWidth: 760, alignSelf: "center" },
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
    docTitle: { flexShrink: 1, color: c.textPrimary, fontFamily: "Inter_600SemiBold" },
    docSub: { flexShrink: 1, color: c.textSecondary, fontSize: 12, marginTop: 3 },
    docUploaded: { borderColor: c.success || "#16A34A" },
    docError: { borderColor: c.error || "#DC2626" },
    preview: { flexShrink: 0, width: 54, height: 54, borderRadius: 8, backgroundColor: c.border },
    successText: { color: c.success || "#16A34A" },
    errorText: { color: c.error || "#DC2626" },
    submit: {
      backgroundColor: c.primary,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      marginTop: 18,
    },
    submitText: { fontFamily: "Inter_700Bold", color: "#fff" },
  });
