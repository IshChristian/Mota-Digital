import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { driverApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { user } = useAuth();
  const { colors } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await driverApi.getLeaderboard(10);
      return res.data?.leaderboard || [];
    },
  });

  const s = styles(colors);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.id === user?.id;
    let badgeColor = colors.textSecondary;
    if (index === 0) badgeColor = "#FFD700"; // Gold
    else if (index === 1) badgeColor = "#C0C0C0"; // Silver
    else if (index === 2) badgeColor = "#CD7F32"; // Bronze

    return (
      <View style={[s.driverItem, isMe && s.meItem]}>
        <View style={s.rankContainer}>
          <Text style={[s.rankText, { color: badgeColor }]}>#{index + 1}</Text>
        </View>

        <View style={s.driverInfo}>
          <Text style={s.driverName}>
            {item.firstName} {item.lastName} {isMe ? "(You)" : ""}
          </Text>
          <Text style={s.tierText}>{item.tier || "Bronze"}</Text>
        </View>

        <View style={s.scoreContainer}>
          <Text style={s.scoreValue}>{item.ridesMonth || 0}</Text>
          <Text style={s.scoreLabel}>rides</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Feather name="x" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("leaderboard")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.heroSection}>
        <Feather name="award" size={64} color="#FFD700" style={s.heroIcon} />
        <Text style={s.heroTitle}>{t("top_drivers")}</Text>
        <Text style={s.heroSubtitle}>Compete to reach Gorilla tier!</Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    heroSection: {
      alignItems: "center",
      paddingVertical: 32,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    heroIcon: {
      marginBottom: 16,
    },
    heroTitle: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
    },
    driverItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    meItem: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}08`,
    },
    rankContainer: {
      width: 40,
      alignItems: "center",
    },
    rankText: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
    },
    driverInfo: {
      flex: 1,
      paddingHorizontal: 16,
    },
    driverName: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    tierText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.textSecondary,
      textTransform: "capitalize",
    },
    scoreContainer: {
      alignItems: "flex-end",
    },
    scoreValue: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    scoreLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.textSecondary,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });
