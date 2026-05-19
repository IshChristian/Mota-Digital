import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PendingApprovalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, updateUser, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    status: string;
    message?: string;
  } | null>(null);

  const registrationStatus = user?.registrationStatus || "pending";

  const checkStatus = useCallback(async (manual = false) => {
    setChecking(true);
    try {
      const res = await authApi.getRegistrationApproval();
      const data = res.data?.data || res.data;
      const newStatus = data?.status || data?.registrationStatus;

      if (newStatus) {
        setStatusInfo({
          status: newStatus,
          message: data?.message || data?.rejectionReason,
        });
        await updateUser({ registrationStatus: newStatus });

        if (newStatus === "approved") {
          // Account is now active, navigate to tabs
          router.replace("/(tabs)");
        } else if (manual) {
           alert("Your status is currently: " + newStatus);
        }
      } else if (manual) {
         alert("Could not determine status. Still pending.");
      }
    } catch (err: any) {
      // Silently handle for auto-poll, but alert if manual
      if (manual) {
         alert(err.response?.data?.message || "Failed to check status. Try again.");
      }
    } finally {
      setChecking(false);
    }
  }, [updateUser, router]);

  // Auto-check every 30 seconds
  useEffect(() => {
    checkStatus(false);
    const interval = setInterval(() => checkStatus(false), 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const s = styles(colors);

  const getStatusConfig = () => {
    switch (registrationStatus) {
      case "correction":
        return {
          icon: "alert-triangle" as const,
          iconColor: "#F59E0B",
          bgColor: "#FEF3C718",
          borderColor: "#F59E0B30",
          title: "Correction Required",
          description:
            "Your registration needs some corrections. Please review the notes from the admin and update your profile.",
        };
      case "approved":
        return {
          icon: "check-circle" as const,
          iconColor: colors.success,
          bgColor: `${colors.success}18`,
          borderColor: `${colors.success}30`,
          title: "Account Approved!",
          description:
            "Your account has been approved. You can now start using MOTA.",
        };
      default:
        return {
          icon: "clock" as const,
          iconColor: colors.primary,
          bgColor: `${colors.primary}18`,
          borderColor: `${colors.primary}30`,
          title: "Under Review",
          description:
            "Your registration is being reviewed by an admin. You'll be notified once your account is approved.",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        s.container,
        {
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 32,
        },
      ]}
    >
      <View
        style={[
          s.iconWrap,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        <Feather name={config.icon} size={56} color={config.iconColor} />
      </View>

      <Text style={s.title}>{config.title}</Text>
      <Text style={s.subtitle}>{config.description}</Text>

      {/* Admin message if any */}
      {statusInfo?.message && (
        <View style={s.messageCard}>
          <Feather name="message-circle" size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.messageLabel}>Admin Note</Text>
            <Text style={s.messageText}>{statusInfo.message}</Text>
          </View>
        </View>
      )}

      {/* Status steps */}
      <View style={s.stepsCard}>
        <Text style={s.stepsTitle}>Registration Progress</Text>

        {[
          {
            label: "Phone Verified",
            done: user?.isVerified !== false,
          },
          {
            label: "Email Verified",
            done: user?.isEmailVerified !== false,
          },
          {
            label: "Registration Paid",
            done: user?.registrationPaid !== false,
          },
          {
            label: "Profile Completed",
            done: user?.kycLevel === "full",
          },
          {
            label: "Admin Approval",
            done: registrationStatus === "approved",
            current: registrationStatus === "pending",
          },
        ].map((step, idx) => (
          <View key={idx} style={s.stepRow}>
            <View
              style={[
                s.stepDot,
                step.done && s.stepDotDone,
                step.current && s.stepDotCurrent,
              ]}
            >
              {step.done ? (
                <Feather name="check" size={12} color="#fff" />
              ) : step.current ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>
            <Text
              style={[
                s.stepLabel,
                step.done && s.stepLabelDone,
                step.current && s.stepLabelCurrent,
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Check status button */}
      <TouchableOpacity
        style={s.checkBtn}
        onPress={() => checkStatus(true)}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={s.checkBtnText}>Check Status</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Correction: let user edit profile */}
      {registrationStatus === "correction" && (
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => {
            // Reset to allow re-editing
            updateUser({ kycLevel: "basic" });
          }}
        >
          <Feather name="edit-3" size={18} color={colors.primary} />
          <Text style={s.editBtnText}>Edit My Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={16} color={colors.textTertiary} />
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      alignItems: "center",
    },
    iconWrap: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 28,
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 28,
      paddingHorizontal: 8,
    },
    messageCard: {
      width: "100%",
      flexDirection: "row",
      gap: 12,
      backgroundColor: `${colors.primary}10`,
      borderRadius: 14,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: `${colors.primary}25`,
    },
    messageLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    messageText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textPrimary,
      lineHeight: 20,
    },
    stepsCard: {
      width: "100%",
      backgroundColor: colors.backgroundCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    stepsTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 16,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 14,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepDotDone: {
      backgroundColor: colors.success,
    },
    stepDotCurrent: {
      backgroundColor: `${colors.primary}25`,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    stepLabel: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    stepLabelDone: {
      color: colors.textPrimary,
      fontFamily: "Inter_500Medium",
    },
    stepLabelCurrent: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    checkBtn: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    checkBtnText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    editBtn: {
      width: "100%",
      backgroundColor: `${colors.primary}15`,
      borderRadius: 12,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginTop: 12,
    },
    editBtnText: {
      color: colors.primary,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 24,
      padding: 12,
    },
    logoutText: {
      color: colors.textTertiary,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
  });
