import React, { useState } from "react";
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
import Colors from "@/constants/colors";
import { useT } from "@/context/I18nContext";

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await driverApi.getLeaderboard(10);
      return res.data?.leaderboard || [];
    },
  });

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isMe = item.id === user?.id;
    let badgeColor = Colors.textSecondary;
    if (index === 0) badgeColor = "#FFD700"; // Gold
    else if (index === 1) badgeColor = "#C0C0C0"; // Silver
    else if (index === 2) badgeColor = "#CD7F32"; // Bronze

    return (
      <View style={[styles.driverItem, isMe && styles.meItem]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: badgeColor }]}>#{index + 1}</Text>
        </View>
        
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>
            {item.firstName} {item.lastName} {isMe ? "(You)" : ""}
          </Text>
          <Text style={styles.tierText}>{item.tier || "Bronze"}</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{item.ridesMonth || 0}</Text>
          <Text style={styles.scoreLabel}>rides</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top || 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("leaderboard")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.heroSection}>
        <Feather name="award" size={64} color="#FFD700" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>{t("top_drivers")}</Text>
        <Text style={styles.heroSubtitle}>Compete to reach Gorilla tier!</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
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
    color: Colors.textPrimary,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  driverItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  meItem: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(230, 57, 70, 0.05)',
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
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  tierText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  scoreContainer: {
    alignItems: "flex-end",
  },
  scoreValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
