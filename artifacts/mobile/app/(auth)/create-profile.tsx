import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { usersApi } from "@/services/api";
import { driverApi, authApi } from "@/services/api";
import { uploadToCloudinary } from "@/services/cloudinary";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

type DocState = {
  uri?: string;
  url?: string;
  uploading: boolean;
  error?: string;
};

export default function CreateProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    insuranceAttachment?: string;
    permitAttachment?: string;
    permitId?: string;
  }>();
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    plateNumber: "",
    cooperativeName: "",
    nid: "",
    permitId: "",
  });

  const [docs, setDocs] = useState<{
    insuranceAttachment: DocState;
    permitAttachment: DocState;
  }>({
    insuranceAttachment: {
      uploading: false,
      url: params.insuranceAttachment || "",
    },
    permitAttachment: {
      uploading: false,
      url: params.permitAttachment || "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const setDoc = (
    key: "insuranceAttachment" | "permitAttachment",
    partial: Partial<DocState>
  ) => {
    setDocs((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }));
  };

  const pickAndUpload = async (
    key: "insuranceAttachment" | "permitAttachment"
  ) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant camera roll access to upload documents."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled) return;
      const asset = result.assets[0];

      setDoc(key, { uri: asset.uri, uploading: true, error: undefined });

      const url = await uploadToCloudinary(asset.uri, "mota-docs");
      setDoc(key, { url, uploading: false });
    } catch (err: any) {
      setDoc(key, { uploading: false, error: "Upload failed. Tap to retry." });
    }
  };

  const isPassenger = user?.role?.toUpperCase() === 'CLIENT' || user?.role?.toUpperCase() === 'PASSENGER';

  const [passengerData, setPassengerData] = useState({
    emergencyContactName: "",
    emergencyContactPhone: "",
    preferredPayment: "CASH", // CASH, MOMO, CARD
  });

  const updatePassenger = (key: string, value: string) =>
    setPassengerData((prev) => ({ ...prev, [key]: value }));

  const handlePassengerSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await usersApi.updateMe({
        emergencyContactName: passengerData.emergencyContactName,
        emergencyContactPhone: passengerData.emergencyContactPhone,
        preferredPayment: passengerData.preferredPayment as "CASH" | "MOMO" | "CARD",
      });
      await updateUser(response.data?.data || { ...passengerData, passengerProfileCompleted: true });
      router.replace("/(passenger)" as any);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isPassenger) {
      await handlePassengerSubmit();
      return;
    }

    if (!formData.plateNumber || !formData.nid) {
      setError("Please fill required fields (Plate Number and National ID)");
      return;
    }
    if (!formData.permitId) {
      setError("Please enter your Permit ID");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await driverApi.createProfile({
        ...formData,
        insuranceAttachment: docs.insuranceAttachment.url || "",
        permitAttachment: docs.permitAttachment.url || "",
        permitId: formData.permitId,
      });

      // Submit registration request for admin review
      try {
        await authApi.submitRegistrationRequest();
      } catch {}

      // After profile creation, update state with pending admin review
      await updateUser({ kycLevel: "full", registrationStatus: "pending" });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create profile";
      if (msg.toLowerCase().includes("already exists")) {
        // Profile already exists — update state
        await updateUser({ kycLevel: "full" });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  const DocUploadCard = ({
    docKey,
    icon,
    title,
    description,
  }: {
    docKey: "insuranceAttachment" | "permitAttachment";
    icon: any;
    title: string;
    description: string;
  }) => {
    const doc = docs[docKey];
    const done = !!doc.url;

    return (
      <TouchableOpacity
        style={[s.docCard, done && s.docCardDone]}
        onPress={() => pickAndUpload(docKey)}
        disabled={doc.uploading}
      >
        <View style={[s.docIconWrap, done && s.docIconWrapDone]}>
          {doc.uploading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : done ? (
            <Feather name="check-circle" size={22} color={colors.success} />
          ) : (
            <Feather name={icon} size={22} color={colors.primary} />
          )}
        </View>
        <View style={s.docInfo}>
          <Text style={s.docTitle}>{title}</Text>
          <Text style={s.docDesc}>
            {doc.error
              ? doc.error
              : done
              ? "Uploaded successfully ✓"
              : description}
          </Text>
        </View>
        {!done && !doc.uploading && (
          <View style={s.uploadBtnSmall}>
            <Feather name="upload" size={14} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        s.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.headerRow}>
        <Text style={s.step}>Complete Your Profile</Text>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: "100%" }]} />
        </View>
      </View>

      <View style={s.iconWrap}>
        <Feather name="user-check" size={40} color={colors.primary} />
      </View>

      {isPassenger ? (
        <View>
          <Text style={s.title}>Passenger Profile</Text>
          <Text style={s.subtitle}>
            Complete your passenger profile details.
          </Text>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <View style={s.inputGroup}>
            <Text style={s.label}>Emergency Contact Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. John Doe"
              placeholderTextColor={colors.textTertiary}
              value={passengerData.emergencyContactName}
              onChangeText={(v) => updatePassenger("emergencyContactName", v)}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Emergency Contact Phone</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 0788123456"
              placeholderTextColor={colors.textTertiary}
              value={passengerData.emergencyContactPhone}
              onChangeText={(v) => updatePassenger("emergencyContactPhone", v)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Preferred Payment Method</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {["CASH", "MOMO", "CARD"].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    s.methodBtn,
                    passengerData.preferredPayment === method && s.methodBtnActive,
                  ]}
                  onPress={() => updatePassenger("preferredPayment", method)}
                >
                  <Text
                    style={[
                      s.methodBtnText,
                      passengerData.preferredPayment === method && s.methodBtnTextActive,
                    ]}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={s.button} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Complete Profile ✓</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={s.title}>Driver Profile</Text>
          <Text style={s.subtitle}>
            Complete your driver profile to start earning.
          </Text>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          {/* Profile Fields */}
          <View style={s.inputGroup}>
            <Text style={s.label}>
              Plate Number <Text style={{ color: colors.primary }}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              placeholder="RAC 123 A"
              placeholderTextColor={colors.textTertiary}
              value={formData.plateNumber}
              onChangeText={(v) => update("plateNumber", v)}
              autoCapitalize="characters"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Cooperative Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Kigali Moto Coop"
              placeholderTextColor={colors.textTertiary}
              value={formData.cooperativeName}
              onChangeText={(v) => update("cooperativeName", v)}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>
              National ID <Text style={{ color: colors.primary }}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              placeholder="1199880012345678"
              placeholderTextColor={colors.textTertiary}
              value={formData.nid}
              onChangeText={(v) => update("nid", v)}
              keyboardType="numeric"
              maxLength={16}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>
              Permit ID <Text style={{ color: colors.primary }}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              placeholder="DL-2024-001234"
              placeholderTextColor={colors.textTertiary}
              value={formData.permitId}
              onChangeText={(v) => update("permitId", v)}
              autoCapitalize="characters"
            />
          </View>

          {/* Document Upload Section */}
          <View style={s.sectionDivider}>
            <View style={s.dividerLine} />
            <Text style={s.sectionLabel}>Upload Documents</Text>
            <View style={s.dividerLine} />
          </View>

          <DocUploadCard
            docKey="insuranceAttachment"
            icon="shield"
            title="Insurance Document"
            description="Upload your bike insurance (JPG, PNG)"
          />
          <DocUploadCard
            docKey="permitAttachment"
            icon="file-text"
            title="Permit Document"
            description="Upload your driving permit (JPG, PNG)"
          />

          <TouchableOpacity style={s.button} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Submit for Approval →</Text>
            )}
          </TouchableOpacity>

          <Text style={s.disclaimer}>
            Your profile will be reviewed by an admin. You'll be notified once
            approved.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
    },
    headerRow: {
      marginBottom: 24,
    },
    step: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    progressBar: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
    },
    progressFill: {
      height: 4,
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: 14,
      color: colors.textPrimary,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    sectionDivider: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 16,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    sectionLabel: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    docCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    docCardDone: {
      borderColor: colors.success,
    },
    docIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    docIconWrapDone: {
      backgroundColor: `${colors.success}18`,
    },
    docInfo: {
      flex: 1,
    },
    docTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    docDesc: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    uploadBtnSmall: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 20,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      marginBottom: 16,
      textAlign: "center",
    },
    disclaimer: {
      marginTop: 12,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 8,
    },
    methodBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    methodBtnActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}12`,
    },
    methodBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
    },
    methodBtnTextActive: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
  });
