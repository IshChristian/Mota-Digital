import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenHeader } from "@/components/ScreenHeader";

import { notificationsApi } from "@/services/api";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { colors } = useTheme();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      let apiNotifs: any[] = [];
      try {
        const res = await notificationsApi.getNotifications(1);
        apiNotifs = res.data?.data || res.data?.notifications || [];
      } catch (e) {}

      let localNotifs: any[] = [];
      try {
        const localStr = await AsyncStorage.getItem("local_notifs");
        if (localStr) localNotifs = JSON.parse(localStr);
      } catch (e) {}

      const all = [...localNotifs, ...apiNotifs];
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return all;
    },
    refetchInterval: 5000,
  });

  const s = styles(colors);
  const all = data || [];
  const promotional = (item: any) => item.metadata?.category === "promotion" || item.type === "promotion" || item.type === "promotional";
  const sections = [
    { title: "Operational", data: all.filter((item) => !promotional(item)) },
    { title: "Promotional", data: all.filter(promotional) },
  ].filter((section) => section.data.length);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[s.notificationItem, !item.read && s.unreadItem]}
      onPress={async () => {
        if (!item.read) {
          if (String(item.id || "").startsWith("local-")) {
            try {
              const localStr = await AsyncStorage.getItem("local_notifs");
              if (localStr) {
                const localNotifs = JSON.parse(localStr);
                const updated = localNotifs.map((n: any) => n.id === item.id ? { ...n, read: true } : n);
                await AsyncStorage.setItem("local_notifs", JSON.stringify(updated));
              }
            } catch (e) {}
          } else {
            await notificationsApi.markRead(item._id || item.id);
          }
          refetch();
        }
      }}
    >
      <View style={s.iconContainer}>
        <Feather name="bell" size={20} color={!item.read ? colors.primary : colors.textSecondary} />
      </View>
      <View style={s.content}>
        <Text style={[s.title, !item.read && s.unreadTitle]}>{item.title}</Text>
        <Text style={s.message}>{item.message}</Text>
        <Text style={s.time}>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <View style={{ paddingHorizontal: 18 }}><ScreenHeader title={t("notifications")} close /></View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => String(item._id || item.id || `${item.createdAt}-${index}`)}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <Text style={{ color: colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 12, marginTop: 10 }}>{section.title}</Text>}
        contentContainerStyle={s.listContent}
        refreshing={isFetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name="bell-off" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptyText}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
    },
    listContent: {
      padding: 16,
    },
    notificationItem: {
      flexDirection: "row",
      padding: 16,
      backgroundColor: colors.backgroundCard,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unreadItem: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    iconContainer: {
      marginRight: 16,
      paddingTop: 2,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontFamily: "Inter_500Medium",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    unreadTitle: {
      fontFamily: "Inter_700Bold",
    },
    message: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    time: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textTertiary,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
  });
