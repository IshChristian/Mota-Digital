import { useEffect, useState } from "react";
import { AppState, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { notificationsApi } from "@/services/api";
import { notificationPage } from "@/services/notificationPage";

export function NotificationBell() {
  const { user, isAuthenticated } = useAuth(),
    { colors } = useTheme(),
    router = useRouter();
  const [active, setActive] = useState(AppState.currentState !== "background" && AppState.currentState !== "inactive");
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => listener.remove();
  }, []);
  const { data, error } = useQuery({
    queryKey: ["notifications", user?.id, "unread-count"],
    enabled: isAuthenticated && !!user?.id && active,
    queryFn: async () =>
      notificationPage((await notificationsApi.getUnread()).data).totalItems,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        error
          ? "Notifications, unread count unavailable"
          : `Notifications${data !== undefined ? `, ${data} unread` : ""}`
      }
      onPress={() => router.push("/notifications")}
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundCard,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Feather name="bell" size={22} color={colors.textPrimary} />
      {error ? (
        <View
          style={{
            position: "absolute",
            right: 1,
            top: 1,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.error,
          }}
        />
      ) : data !== undefined && data > 0 ? (
        <View
          style={{
            position: "absolute",
            right: -5,
            top: -5,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 4,
            borderRadius: 10,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
            {data > 99 ? "99+" : data}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
