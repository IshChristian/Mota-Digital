import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { uploadToCloudinary } from "@/services/cloudinary";

type DocType = "insuranceAttachment" | "permitAttachment" | "permitId";

type DocState = {
  uri?: string;
  url?: string;
  uploading: boolean;
  error?: string;
};

export default function UploadDocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [docs, setDocs] = useState<Record<DocType, DocState>>({
    insuranceAttachment: { uploading: false },
    permitAttachment: { uploading: false },
    permitId: { uploading: false },
  });

  const setDoc = (key: DocType, partial: Partial<DocState>) => {
    setDocs((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }));
  };

  const pickAndUpload = async (key: DocType) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant camera roll access to upload documents.");
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

  const allDone = docs.insuranceAttachment.url && docs.permitAttachment.url && docs.permitId.url;

  const handleContinue = () => {
    router.push({
      pathname: "/(auth)/create-profile",
      params: {
        insuranceAttachment: docs.insuranceAttachment.url,
        permitAttachment: docs.permitAttachment.url,
        permitId: docs.permitId.url,
      },
    });
  };

  const s = styles(colors);

  const DocCard = ({
    docKey,
    icon,
    title,
    description,
  }: {
    docKey: DocType;
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
            <Feather name="check-circle" size={24} color={colors.success} />
          ) : (
            <Feather name={icon} size={24} color={colors.primary} />
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
          {doc.uri && !doc.url && !doc.uploading && (
            <Text style={s.uploadingText}>Uploading...</Text>
          )}
        </View>
        {!done && !doc.uploading && (
          <View style={s.uploadBtn}>
            <Feather name="upload" size={16} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={s.headerRow}>
        <Text style={s.step}>Step 1 of 2</Text>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: "50%" }]} />
        </View>
      </View>

      <View style={s.iconWrap}>
        <Feather name="folder" size={40} color={colors.primary} />
      </View>
      <Text style={s.title}>Upload Documents</Text>
      <Text style={s.subtitle}>
        We need these documents to verify your driver profile.
      </Text>

      <DocCard
        docKey="insuranceAttachment"
        icon="shield"
        title="Insurance Document"
        description="Upload your bike insurance certificate (JPG, PNG)"
      />
      <DocCard
        docKey="permitAttachment"
        icon="file-text"
        title="Permit Document"
        description="Upload your driving permit (JPG, PNG)"
      />
      <DocCard
        docKey="permitId"
        icon="credit-card"
        title="Permit ID Photo"
        description="Upload a clear photo of your permit ID"
      />

      <TouchableOpacity
        style={[s.continueBtn, !allDone && s.continueBtnDisabled]}
        onPress={handleContinue}
        disabled={!allDone}
      >
        <Text style={s.continueBtnText}>Continue to Profile Setup →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.skipBtn}
        onPress={() => router.push("/(auth)/create-profile")}
      >
        <Text style={s.skipText}>Skip for now</Text>
      </TouchableOpacity>
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
      marginBottom: 32,
    },
    docCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    docCardDone: {
      borderColor: colors.success,
    },
    docIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    docIconWrapDone: {
      backgroundColor: `${colors.success}18`,
    },
    docInfo: {
      flex: 1,
    },
    docTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    docDesc: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    uploadingText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
      marginTop: 4,
    },
    uploadBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center",
      justifyContent: "center",
    },
    continueBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 24,
    },
    continueBtnDisabled: {
      opacity: 0.4,
    },
    continueBtnText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    skipBtn: {
      alignItems: "center",
      marginTop: 16,
      padding: 8,
    },
    skipText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
  });
