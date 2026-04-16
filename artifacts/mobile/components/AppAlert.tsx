import React from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

export type AlertType = "success" | "error" | "warning" | "info" | "confirm";

export type AppAlertProps = {
    visible: boolean;
    type?: AlertType;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
};

const TYPE_CONFIG: Record<
    AlertType,
    { icon: any; colorKey: "success" | "error" | "primary" | "textSecondary" }
> = {
    success: { icon: "check-circle", colorKey: "success" },
    error: { icon: "alert-circle", colorKey: "error" },
    warning: { icon: "alert-triangle", colorKey: "primary" },
    info: { icon: "info", colorKey: "primary" },
    confirm: { icon: "help-circle", colorKey: "primary" },
};

export function AppAlert({
    visible,
    type = "info",
    title,
    message,
    confirmText = "OK",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
}: AppAlertProps) {
    const { colors } = useTheme();
    const config = TYPE_CONFIG[type];
    const iconColor = colors[config.colorKey];
    const isConfirm = type === "confirm";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onCancel || onConfirm}
        >
            <View style={styles.overlay}>
                <View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.backgroundCard,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    {/* Icon */}
                    <View
                        style={[
                            styles.iconWrap,
                            { backgroundColor: `${iconColor}18` },
                        ]}
                    >
                        <Feather name={config.icon} size={32} color={iconColor} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {title}
                    </Text>

                    {/* Message */}
                    {!!message && (
                        <Text style={[styles.message, { color: colors.textSecondary }]}>
                            {message}
                        </Text>
                    )}

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Buttons */}
                    <View style={[styles.btnRow, isConfirm && styles.btnRowDouble]}>
                        {isConfirm && (
                            <TouchableOpacity
                                style={[
                                    styles.btn,
                                    styles.btnCancel,
                                    { borderColor: colors.border, backgroundColor: colors.backgroundElevated },
                                ]}
                                onPress={onCancel}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.btnText, { color: colors.textSecondary }]}>
                                    {cancelText}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.btn,
                                styles.btnConfirm,
                                {
                                    backgroundColor:
                                        type === "error" ? colors.error : type === "success" ? colors.success : colors.primary,
                                },
                            ]}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnConfirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    sheet: {
        width: "100%",
        borderRadius: 24,
        padding: 28,
        alignItems: "center",
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    title: {
        fontSize: 20,
        fontFamily: "Inter_700Bold",
        textAlign: "center",
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        fontFamily: "Inter_400Regular",
        textAlign: "center",
        lineHeight: 21,
        marginBottom: 4,
    },
    divider: {
        width: "100%",
        height: 1,
        marginVertical: 20,
    },
    btnRow: {
        width: "100%",
        flexDirection: "row",
        gap: 10,
    },
    btnRowDouble: {
        flexDirection: "row",
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    btnCancel: {
        borderWidth: 1,
    },
    btnConfirm: {
        // backgroundColor set inline
    },
    btnText: {
        fontSize: 15,
        fontFamily: "Inter_600SemiBold",
    },
    btnConfirmText: {
        fontSize: 15,
        fontFamily: "Inter_700Bold",
        color: "#fff",
    },
});
