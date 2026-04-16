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
import { driverApi } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!formData.plateNumber || !formData.nid) {
      setError("Please fill required fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await driverApi.createProfile({
        ...formData,
        insuranceAttachment: params.insuranceAttachment || "",
        permitAttachment: params.permitAttachment || "",
        permitId: params.permitId || "",
      });
      // After profile creation, update state (which triggers navigation)
      await updateUser({ kycLevel: 'full' });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create profile";
      if (msg.toLowerCase().includes("already exists")) {
        // Profile already exists — update state
        await updateUser({ kycLevel: 'full' });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.headerRow}>
        <Text style={s.step}>Step 2 of 2</Text>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: "100%" }]} />
        </View>
      </View>

      <View style={s.iconWrap}>
        <Feather name="user-check" size={40} color={colors.primary} />
      </View>
      <Text style={s.title}>Driver Profile</Text>
      <Text style={s.subtitle}>Complete your driver profile to start earning.</Text>

      {params.insuranceAttachment || params.permitAttachment ? (
        <View style={s.uploadedBadge}>
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text style={s.uploadedText}>Documents uploaded ✓</Text>
        </View>
      ) : null}

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <View style={s.inputGroup}>
        <Text style={s.label}>Plate Number <Text style={{ color: colors.primary }}>*</Text></Text>
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
        <Text style={s.label}>National ID <Text style={{ color: colors.primary }}>*</Text></Text>
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

      <TouchableOpacity style={s.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>Complete Profile →</Text>
        )}
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
      marginBottom: 24,
    },
    uploadedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: `${colors.success}18`,
      borderRadius: 8,
      padding: 10,
      marginBottom: 20,
    },
    uploadedText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.success,
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
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
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
